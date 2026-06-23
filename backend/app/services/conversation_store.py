"""轻量 SQLite 会话/消息持久化。

设计取舍（混合方案）：会话(conversation)与消息(message)上 SQLite，设置仍留 JSON。
- 会话会增长、要按 agent 过滤、要"最近会话"排序、要单条删除——关系型查询/事务/锁更合适。
- 设置体量小、整存整取、需手改、进 git 看 diff——留 JSON 更直观。

消息直接存前端 assistant-ui 的完整 ThreadMessage（JSON），无损往返，保留思考链/工具调用/媒体等所有 part。
仅用标准库 sqlite3，不引入额外依赖（ORM）。
"""
import json
import logging
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# backend/app/services/conversation_store.py -> backend/
DB_PATH = Path(__file__).resolve().parents[2] / "storage" / "polystudio.db"


def _now() -> int:
    return int(time.time() * 1000)


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS conversation (
                id          TEXT PRIMARY KEY,
                agent       TEXT NOT NULL,
                title       TEXT,
                status      TEXT NOT NULL DEFAULT 'regular',
                external_id TEXT,
                created_at  INTEGER NOT NULL,
                updated_at  INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_conv_agent
                ON conversation(agent, status, updated_at DESC);

            CREATE TABLE IF NOT EXISTS message (
                id              TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                parent_id       TEXT,
                position        INTEGER NOT NULL,
                payload         TEXT NOT NULL,
                created_at      INTEGER NOT NULL,
                FOREIGN KEY(conversation_id) REFERENCES conversation(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_msg_conv
                ON message(conversation_id, position);
            """
        )
    logger.info("conversation_store 初始化完成: %s", DB_PATH)


def _conv_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "agent": row["agent"],
        "title": row["title"],
        "status": row["status"],
        "externalId": row["external_id"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def list_conversations(agent: Optional[str] = None) -> List[Dict[str, Any]]:
    with _connect() as conn:
        if agent:
            rows = conn.execute(
                "SELECT * FROM conversation WHERE agent = ? ORDER BY updated_at DESC",
                (agent,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM conversation ORDER BY updated_at DESC"
            ).fetchall()
    return [_conv_to_dict(r) for r in rows]


def get_conversation(conv_id: str) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM conversation WHERE id = ?", (conv_id,)
        ).fetchone()
    return _conv_to_dict(row) if row else None


def create_conversation(
    agent: str,
    conv_id: Optional[str] = None,
    external_id: Optional[str] = None,
    title: Optional[str] = None,
) -> Dict[str, Any]:
    conv_id = conv_id or f"conv-{uuid.uuid4().hex}"
    ts = _now()
    with _connect() as conn:
        conn.execute(
            """INSERT OR IGNORE INTO conversation
               (id, agent, title, status, external_id, created_at, updated_at)
               VALUES (?, ?, ?, 'regular', ?, ?, ?)""",
            (conv_id, agent, title, external_id, ts, ts),
        )
    conv = get_conversation(conv_id)
    assert conv is not None
    return conv


def update_conversation(
    conv_id: str,
    title: Optional[str] = None,
    status: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    sets: List[str] = []
    args: List[Any] = []
    if title is not None:
        sets.append("title = ?")
        args.append(title)
    if status is not None:
        sets.append("status = ?")
        args.append(status)
    if not sets:
        return get_conversation(conv_id)
    sets.append("updated_at = ?")
    args.append(_now())
    args.append(conv_id)
    with _connect() as conn:
        conn.execute(
            f"UPDATE conversation SET {', '.join(sets)} WHERE id = ?", args
        )
    return get_conversation(conv_id)


def delete_conversation(conv_id: str) -> bool:
    with _connect() as conn:
        conn.execute("DELETE FROM conversation WHERE id = ?", (conv_id,))
    return True


def load_messages(conv_id: str) -> Dict[str, Any]:
    """返回 assistant-ui ExportedMessageRepository 形态：{headId, messages:[{message,parentId}]}。"""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM message WHERE conversation_id = ? ORDER BY position ASC",
            (conv_id,),
        ).fetchall()
    messages: List[Dict[str, Any]] = []
    for r in rows:
        messages.append(
            {"message": json.loads(r["payload"]), "parentId": r["parent_id"]}
        )
    head_id = messages[-1]["message"].get("id") if messages else None
    return {"headId": head_id, "messages": messages}


def append_message(
    conv_id: str,
    message: Dict[str, Any],
    parent_id: Optional[str] = None,
) -> None:
    msg_id = message.get("id")
    if not msg_id:
        raise ValueError("message.id is required")
    ts = _now()
    with _connect() as conn:
        # 会话不存在则容错创建（agent 未知时用占位，正常路径已先 create）
        exists = conn.execute(
            "SELECT 1 FROM conversation WHERE id = ?", (conv_id,)
        ).fetchone()
        if not exists:
            conn.execute(
                """INSERT INTO conversation
                   (id, agent, title, status, external_id, created_at, updated_at)
                   VALUES (?, '', NULL, 'regular', NULL, ?, ?)""",
                (conv_id, ts, ts),
            )
        row = conn.execute(
            "SELECT COALESCE(MAX(position), -1) AS m FROM message WHERE conversation_id = ?",
            (conv_id,),
        ).fetchone()
        next_pos = int(row["m"]) + 1
        payload = json.dumps(message, ensure_ascii=False)
        conn.execute(
            """INSERT INTO message (id, conversation_id, parent_id, position, payload, created_at)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                   parent_id = excluded.parent_id,
                   payload = excluded.payload""",
            (msg_id, conv_id, parent_id, next_pos, payload, ts),
        )
        conn.execute(
            "UPDATE conversation SET updated_at = ? WHERE id = ?", (ts, conv_id)
        )


def delete_messages(conv_id: str, message_ids: List[str]) -> None:
    if not message_ids:
        return
    placeholders = ",".join("?" for _ in message_ids)
    with _connect() as conn:
        conn.execute(
            f"DELETE FROM message WHERE conversation_id = ? AND id IN ({placeholders})",
            [conv_id, *message_ids],
        )
