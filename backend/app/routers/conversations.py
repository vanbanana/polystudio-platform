"""会话/消息持久化 REST 接口（SQLite）。

对接前端 assistant-ui 的 RemoteThreadListAdapter + ThreadHistoryAdapter：
- GET    /api/conversations?agent=        列出某 agent 的会话
- POST   /api/conversations                新建会话（initialize）→ 返回 remoteId
- PATCH  /api/conversations/{id}           重命名 / 归档
- DELETE /api/conversations/{id}           删除会话（级联删消息）
- GET    /api/conversations/{id}/messages  加载会话消息（ExportedMessageRepository）
- POST   /api/conversations/{id}/messages  追加一条消息
- DELETE /api/conversations/{id}/messages  删除若干消息
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import conversation_store

router = APIRouter()


class CreateConversation(BaseModel):
    agent: str
    id: Optional[str] = None
    externalId: Optional[str] = None
    title: Optional[str] = None


class UpdateConversation(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None


class AppendMessage(BaseModel):
    message: Dict[str, Any]
    parentId: Optional[str] = None


class DeleteMessages(BaseModel):
    ids: List[str]


@router.get("/conversations")
async def list_conversations(agent: Optional[str] = None):
    return {"conversations": conversation_store.list_conversations(agent)}


@router.post("/conversations")
async def create_conversation(body: CreateConversation):
    conv = conversation_store.create_conversation(
        agent=body.agent,
        conv_id=body.id,
        external_id=body.externalId,
        title=body.title,
    )
    return {"remoteId": conv["id"], "externalId": conv["externalId"]}


@router.patch("/conversations/{conv_id}")
async def update_conversation(conv_id: str, body: UpdateConversation):
    conv = conversation_store.update_conversation(
        conv_id, title=body.title, status=body.status
    )
    if conv is None:
        raise HTTPException(status_code=404, detail="conversation not found")
    return conv


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    conversation_store.delete_conversation(conv_id)
    return {"ok": True}


@router.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: str):
    return conversation_store.load_messages(conv_id)


@router.post("/conversations/{conv_id}/messages")
async def append_message(conv_id: str, body: AppendMessage):
    conversation_store.append_message(conv_id, body.message, body.parentId)
    return {"ok": True}


@router.delete("/conversations/{conv_id}/messages")
async def delete_messages(conv_id: str, body: DeleteMessages):
    conversation_store.delete_messages(conv_id, body.ids)
    return {"ok": True}
