# Lightricks LTX-2 Video Generation

**Model:** https://huggingface.co/Lightricks/LTX-2.3-nvfp4
**GitHub:** https://github.com/Lightricks/LTX-2
**Playground:** https://console.ltx.video/playground/

## Status

**No public REST API available** as of April 2026.

## Available Interfaces

### CLI
```bash
python -m ltx_pipelines.ti2vid_two_stages \
  --checkpoint-path path/to/checkpoint.safetensors \
  --distilled-lora path/to/distilled_lora.safetensors 0.8 \
  --spatial-upsampler-path path/to/upsampler.safetensors \
  --gemma-root path/to/gemma \
  --prompt "A beautiful sunset over the ocean" \
  --output-path output.mp4
```

### Pipeline Modules
- `ti2vid_two_stages` — Text/image-to-video (recommended)
- `ti2vid_two_stages_hq` — Higher quality sampler
- `distilled` — Fast inference
- `ic_lora` — Video-to-video
- `keyframe_interpolation` — Keyframe-driven
- `a2vid_two_stage` — Audio-to-video

### ComfyUI
Built-in LTXVideo nodes via ComfyUI Manager.

## Requirements
- Python >= 3.12
- CUDA > 12.7
- PyTorch ~= 2.7

## Capabilities
- Text-to-video
- Image-to-video
- Audio-synchronized video generation
- Width/height must be divisible by 32
- Frame count must be divisible by 8 + 1
