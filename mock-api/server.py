"""
PolyStudio Mock Provider API
============================
独立、可随时启停的「模拟厂商 API」服务。它复刻各家外部模型厂商官方接口的
请求/响应字段（火山 Seedream 文生图/改图、火山 Seedance 视频、腾讯混元生 3D、
阿里 DashScope Qwen-TTS / Qwen-Omni），但所有产物都指向本服务托管的真实下载素材
（公开图片 / 公开 GLB 模型 / 测试视频 / 公开音源）。

目的：让 PolyStudio 后端工具走「真实 HTTP 请求 → 解析响应 → 下载落地 /storage」
的完整链路，从而验证前端显示与原项目功能是否对齐——而不真正调用付费 API。

对话（Agent 决策）不在此模拟：直接接真实便宜 LLM（DeepSeek，OpenAI 兼容）。

启动： ./start.sh     停止： ./stop.sh
默认端口 8900，可用环境变量 MOCK_API_PORT / MOCK_API_PUBLIC_URL 覆盖。
"""
import base64
import itertools
import logging
import os
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

logging.basicConfig(level=logging.INFO, format="%(asctime)s [mock-api] %(message)s")
logger = logging.getLogger("mock-api")

BASE_DIR = Path(__file__).parent
ASSETS_DIR = Path(os.getenv("MOCK_ASSETS_DIR", str(BASE_DIR / "assets"))).resolve()

PORT = int(os.getenv("MOCK_API_PORT", "8900"))
# 返回给后端的、可下载的对外地址。后端会用 requests.get 拉取这些 URL。
PUBLIC_URL = os.getenv("MOCK_API_PUBLIC_URL", f"http://localhost:{PORT}").rstrip("/")

app = FastAPI(title="PolyStudio Mock Provider API", version="1.0.0")

# 把本地素材以 /files/... 暴露成可下载 URL
app.mount("/files", StaticFiles(directory=str(ASSETS_DIR)), name="files")


def _list(sub: str) -> List[str]:
    d = ASSETS_DIR / sub
    if not d.exists():
        return []
    return sorted(p.name for p in d.iterdir() if p.is_file())


# 轮询器：每次生成换一个素材，方便测试「多图/多模型/多视频/多播客」累积展示
_IMAGES = _list("images")
_VIDEOS = _list("videos")
_MODELS = [m for m in _list("models") if m.endswith(".glb")]
_AUDIO_MUSIC = [a for a in _list("audio") if a.endswith((".mp3", ".wav"))]
_SPEECH_WAV = next((a for a in _list("audio") if "speech" in a and a.endswith(".wav")), None)

_img_cycle = itertools.cycle(_IMAGES or ["__none__"])
_vid_cycle = itertools.cycle(_VIDEOS or ["__none__"])
_mdl_cycle = itertools.cycle(_MODELS or ["__none__"])
_aud_cycle = itertools.cycle(_AUDIO_MUSIC or ["__none__"])


def file_url(sub: str, name: str) -> str:
    return f"{PUBLIC_URL}/files/{sub}/{name}"


def next_image_url() -> str:
    return file_url("images", next(_img_cycle))


def next_video_url() -> str:
    return file_url("videos", next(_vid_cycle))


def next_audio_url() -> str:
    return file_url("audio", next(_aud_cycle))


def model_preview_url(model_name: str) -> str:
    stem = Path(model_name).stem
    preview = ASSETS_DIR / "previews" / f"{stem}.png"
    if preview.exists():
        return file_url("previews", f"{stem}.png")
    return next_image_url()


# 内存任务表（模拟异步任务的"提交 + 轮询"两段式）
_video_tasks: Dict[str, Dict[str, Any]] = {}
_ai3d_jobs: Dict[str, Dict[str, Any]] = {}
# 任务在该秒数后从 running -> succeeded（poll_interval≈3-5s，1~2 次轮询即完成）
TASK_DELAY = float(os.getenv("MOCK_TASK_DELAY", "6"))


# ---------------------------------------------------------------------------
# 火山引擎 Ark —— Seedream 文生图 / 改图
#   官方端点: POST {base}/images/generations
#   base 在后端配置为 http://localhost:8900/api/v3
# ---------------------------------------------------------------------------
@app.post("/api/v3/images/generations")
async def volcano_images_generations(request: Request):
    body = await request.json()
    model = body.get("model", "seedream-4.5")
    n = int(body.get("n", 1) or 1)
    size = body.get("size", "2048x2048")
    is_edit = "image" in body and body.get("image")
    kind = "改图" if is_edit else "文生图"
    logger.info(f"🎨 [火山/{kind}] model={model} n={n} size={size} prompt={str(body.get('prompt'))[:40]!r}")

    data = [{"url": next_image_url(), "size": size} for _ in range(max(1, n))]
    resp = {
        "model": model,
        "created": int(time.time()),
        "data": data,
        "usage": {"generated_images": len(data), "output_tokens": 0, "total_tokens": 0},
    }
    return JSONResponse(resp)


# ---------------------------------------------------------------------------
# 火山引擎 Ark —— Seedance 视频生成（异步：提交任务 + 轮询）
#   提交: POST {base}/contents/generations/tasks       -> { id }
#   查询: GET  {base}/contents/generations/tasks/{id}  -> { status, content.video_url }
# ---------------------------------------------------------------------------
@app.post("/api/v3/contents/generations/tasks")
async def volcano_video_submit(request: Request):
    body = await request.json()
    model = body.get("model", "doubao-seedance-1-5-pro")
    task_id = f"cgt-{uuid.uuid4().hex[:20]}"
    _video_tasks[task_id] = {
        "created": time.time(),
        "model": model,
        "video_url": next_video_url(),
        "ratio": body.get("ratio", "16:9"),
    }
    logger.info(f"🎬 [火山/视频] 提交任务 id={task_id} model={model} ratio={body.get('ratio')}")
    return JSONResponse({"id": task_id, "model": model, "status": "queued"})


@app.get("/api/v3/contents/generations/tasks/{task_id}")
async def volcano_video_query(task_id: str):
    task = _video_tasks.get(task_id)
    if not task:
        return JSONResponse({"error": {"code": "NotFound", "message": "task not found"}}, status_code=404)
    elapsed = time.time() - task["created"]
    if elapsed < TASK_DELAY:
        logger.info(f"⏳ [火山/视频] {task_id} running ({elapsed:.0f}s)")
        return JSONResponse({"id": task_id, "model": task["model"], "status": "running"})
    logger.info(f"✅ [火山/视频] {task_id} succeeded -> {task['video_url']}")
    return JSONResponse({
        "id": task_id,
        "model": task["model"],
        "status": "succeeded",
        "content": {"video_url": task["video_url"]},
        "usage": {"completion_tokens": 0, "total_tokens": 0},
        "created_at": int(task["created"]),
        "updated_at": int(time.time()),
    })


# ---------------------------------------------------------------------------
# 腾讯混元生 3D —— 图生3D / 文生3D（异步：submit + query）
#   提交: POST {base}/v1/ai3d/submit  -> { Response: { JobId } }
#   查询: POST {base}/v1/ai3d/query   -> { Response: { Status, ResultFile3Ds:[{Type,Url,PreviewImageUrl}] } }
# ---------------------------------------------------------------------------
@app.post("/v1/ai3d/submit")
async def tencent_ai3d_submit(request: Request):
    body = await request.json()
    job_id = f"{int(time.time())}{uuid.uuid4().int % 10**9:09d}"
    model_name = next(_mdl_cycle)
    _ai3d_jobs[job_id] = {"created": time.time(), "model": model_name}
    mode = "文生3D" if body.get("Prompt") else "图生3D"
    logger.info(f"🧊 [腾讯/3D] 提交任务({mode}) JobId={job_id} -> {model_name}")
    return JSONResponse({"Response": {"JobId": job_id, "RequestId": uuid.uuid4().hex}})


@app.post("/v1/ai3d/query")
async def tencent_ai3d_query(request: Request):
    body = await request.json()
    job_id = str(body.get("JobId", ""))
    job = _ai3d_jobs.get(job_id)
    if not job:
        return JSONResponse({"Response": {"JobId": job_id, "Status": "FAIL",
                                          "ErrorCode": "JobNotFound", "ErrorMessage": "job not found",
                                          "RequestId": uuid.uuid4().hex}})
    elapsed = time.time() - job["created"]
    if elapsed < TASK_DELAY:
        logger.info(f"⏳ [腾讯/3D] {job_id} RUN ({elapsed:.0f}s)")
        return JSONResponse({"Response": {"JobId": job_id, "Status": "RUN", "RequestId": uuid.uuid4().hex}})
    model_name = job["model"]
    glb_url = file_url("models", model_name)
    preview = model_preview_url(model_name)
    logger.info(f"✅ [腾讯/3D] {job_id} DONE -> {glb_url}")
    return JSONResponse({"Response": {
        "JobId": job_id,
        "Status": "DONE",
        "ResultFile3Ds": [{"Type": "GLB", "Url": glb_url, "PreviewImageUrl": preview}],
        "ErrorCode": "",
        "ErrorMessage": "",
        "RequestId": uuid.uuid4().hex,
    }})


# ---------------------------------------------------------------------------
# 阿里云 DashScope —— Qwen-TTS 声音设计 / 声音复刻
#   音色定制: POST {base}/api/v1/services/audio/tts/customization
#   语音合成: POST {base}/api/v1/services/aigc/multimodal-generation/generation
# ---------------------------------------------------------------------------
def _speech_b64() -> str:
    if _SPEECH_WAV:
        data = (ASSETS_DIR / "audio" / _SPEECH_WAV).read_bytes()
        return base64.b64encode(data).decode("utf-8")
    return ""


@app.post("/api/v1/services/audio/tts/customization")
async def dashscope_tts_customization(request: Request):
    body = await request.json()
    model = body.get("model", "")
    inp = body.get("input", {}) or {}
    request_id = uuid.uuid4().hex
    if model == "qwen-voice-design":
        voice = f"vd-{uuid.uuid4().hex[:8]}"
        logger.info(f"🎙️ [DashScope/声音设计] target={inp.get('target_model')} voice={voice}")
        return JSONResponse({
            "output": {"voice": voice, "preview_audio": {"data": _speech_b64()}},
            "usage": {"characters": len(str(inp.get("preview_text", "")))},
            "request_id": request_id,
        })
    # qwen-voice-enrollment（声音复刻：仅创建音色）
    voice = f"vc-{uuid.uuid4().hex[:8]}"
    logger.info(f"🎙️ [DashScope/声音复刻] 创建音色 voice={voice}")
    return JSONResponse({"output": {"voice": voice}, "usage": {}, "request_id": request_id})


@app.post("/api/v1/services/aigc/multimodal-generation/generation")
async def dashscope_synthesis(request: Request):
    body = await request.json()
    inp = body.get("input", {}) or {}
    logger.info(f"🔊 [DashScope/合成] voice={inp.get('voice')} text={str(inp.get('text'))[:30]!r}")
    return JSONResponse({
        "output": {"audio": {"url": next_audio_url(), "expires_at": int(time.time()) + 3600}},
        "usage": {"characters": len(str(inp.get("text", "")))},
        "request_id": uuid.uuid4().hex,
    })


# ---------------------------------------------------------------------------
# 阿里云 DashScope —— Qwen-Omni 多模态理解（OpenAI 兼容）
#   POST {base}/compatible-mode/v1/chat/completions
#   仅做最小实现（返回固定理解文本）。核心 5 个工作台不依赖它。
# ---------------------------------------------------------------------------
@app.post("/compatible-mode/v1/chat/completions")
async def dashscope_omni_chat(request: Request):
    body = await request.json()
    model = body.get("model", "qwen3-omni")
    stream = bool(body.get("stream", False))
    text = "（模拟）已理解输入内容：这是一段用于测试链路的多模态理解结果。"
    created = int(time.time())
    cid = f"chatcmpl-{uuid.uuid4().hex[:16]}"
    if stream:
        def gen():
            import json as _json
            for ch in [text[i:i + 8] for i in range(0, len(text), 8)]:
                chunk = {"id": cid, "object": "chat.completion.chunk", "created": created,
                         "model": model, "choices": [{"index": 0, "delta": {"content": ch}, "finish_reason": None}]}
                yield f"data: {_json.dumps(chunk, ensure_ascii=False)}\n\n"
            done = {"id": cid, "object": "chat.completion.chunk", "created": created, "model": model,
                    "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}
            yield f"data: {_json.dumps(done, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(gen(), media_type="text/event-stream")
    return JSONResponse({
        "id": cid, "object": "chat.completion", "created": created, "model": model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 0, "completion_tokens": len(text), "total_tokens": len(text)},
    })


# ---------------------------------------------------------------------------
# 健康检查 / 信息
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"service": "PolyStudio Mock Provider API", "status": "ok", "public_url": PUBLIC_URL}


@app.get("/__mock/info")
async def info():
    return {
        "public_url": PUBLIC_URL,
        "assets_dir": str(ASSETS_DIR),
        "assets": {
            "images": _IMAGES, "videos": _VIDEOS, "models": _MODELS,
            "audio": _AUDIO_MUSIC, "speech_wav": _SPEECH_WAV,
        },
        "task_delay_seconds": TASK_DELAY,
        "endpoints": {
            "volcano_image": "POST /api/v3/images/generations",
            "volcano_video_submit": "POST /api/v3/contents/generations/tasks",
            "volcano_video_query": "GET /api/v3/contents/generations/tasks/{id}",
            "tencent_3d_submit": "POST /v1/ai3d/submit",
            "tencent_3d_query": "POST /v1/ai3d/query",
            "dashscope_tts_customization": "POST /api/v1/services/audio/tts/customization",
            "dashscope_tts_synthesis": "POST /api/v1/services/aigc/multimodal-generation/generation",
            "dashscope_omni": "POST /compatible-mode/v1/chat/completions",
        },
    }


if __name__ == "__main__":
    import uvicorn
    logger.info(f"启动 Mock Provider API：端口={PORT} 对外地址={PUBLIC_URL}")
    logger.info(f"素材目录：{ASSETS_DIR}（图{len(_IMAGES)} 视频{len(_VIDEOS)} 模型{len(_MODELS)} 音频{len(_AUDIO_MUSIC)}）")
    uvicorn.run(app, host=os.getenv("MOCK_API_HOST", "0.0.0.0"), port=PORT, log_level="warning")
