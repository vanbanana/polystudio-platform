#!/usr/bin/env bash
# 重新下载测试素材 + 生成模型预览图。
# 说明：assets/ 已随仓库提供，正常使用无需运行本脚本；它仅用于记录素材来源、
#       或在需要重建素材时使用。所有素材均为公开、无需鉴权的测试文件。
#       部分外部托管地址可能随时间变化，若个别失败可自行替换为等价的公开文件。
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p assets/images assets/videos assets/models assets/audio assets/previews

dl() {  # dl <url> <out>
  local url="$1" out="$2"
  if [ -s "$out" ]; then echo "skip  $out"; return; fi
  echo "get   $out"
  curl -fsSL --retry 2 -o "$out" "$url" || echo "FAIL  $out  ($url)"
}

# --- 图片：OpenCV 公开 sample（GitHub raw） ---
OCV=https://raw.githubusercontent.com/opencv/opencv/master/samples/data
dl "$OCV/baboon.jpg"   assets/images/img_baboon.jpg
dl "$OCV/lena.jpg"     assets/images/img_lena.jpg
dl "$OCV/fruits.jpg"   assets/images/img_fruits.jpg
dl "$OCV/messi5.jpg"   assets/images/img_scene.jpg
dl "$OCV/board.jpg"    assets/images/img_texture.jpg
dl "$OCV/dog.jpg"      assets/images/img_dog.jpg

# --- 3D 模型：KhronosGroup glTF-Sample-Assets（GLB） ---
GLTF=https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models
dl "$GLTF/Avocado/glTF-Binary/Avocado.glb" assets/models/avocado.glb
dl "$GLTF/BoomBox/glTF-Binary/BoomBox.glb" assets/models/boombox.glb
dl "$GLTF/Lantern/glTF-Binary/Lantern.glb" assets/models/lantern.glb
dl "$GLTF/Duck/glTF-Binary/Duck.glb"       assets/models/duck.glb

# --- 视频：samplelib 公开测试 mp4 ---
dl "https://download.samplelib.com/mp4/sample-5s.mp4"  assets/videos/sample-5s.mp4
dl "https://download.samplelib.com/mp4/sample-10s.mp4" assets/videos/sample-10s.mp4
dl "https://download.samplelib.com/mp4/sample-15s.mp4" assets/videos/sample-15s.mp4

# --- 音频：公开音源 ---
dl "https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav" assets/audio/speech_male.wav
dl "https://www.kozco.com/tech/piano2.wav"                      assets/audio/music_piano.wav
dl "https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.mp3" assets/audio/music_outfoxing.mp3
dl "https://github.com/mdn/webaudio-examples/raw/main/audio-basics/outfoxing.mp3"   assets/audio/podcast_sample.mp3

# --- 模型预览图：用 Pillow 生成占位预览（与 server.py 的 previews 约定一致） ---
PY=./.venv/bin/python; [ -x "$PY" ] || PY=python3
"$PY" - <<'PYEOF'
from pathlib import Path
try:
    from PIL import Image, ImageDraw
except Exception:
    print("Pillow 未安装，跳过预览生成（运行 ./start.sh 安装依赖后重试）"); raise SystemExit(0)
colors = {"avocado": (124,160,72), "boombox": (210,180,60), "lantern": (180,140,90), "duck": (230,200,60)}
out = Path("assets/previews"); out.mkdir(parents=True, exist_ok=True)
for stem in [p.stem for p in Path("assets/models").glob("*.glb")]:
    img = Image.new("RGB", (128,128), (28,25,23))
    d = ImageDraw.Draw(img)
    d.ellipse((24,24,104,104), fill=colors.get(stem,(150,150,150)))
    img.save(out / f"{stem}.png")
    print("preview", stem)
PYEOF

echo "done. 统计："
find assets -type f | sed 's#/[^/]*$##' | sort | uniq -c
