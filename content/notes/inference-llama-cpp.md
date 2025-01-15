+++
title = "Inference with llama-cpp and Docker"
date = 2025-01-13
+++

See the official [Docker docs](https://github.com/ggerganov/llama.cpp/blob/master/docs/docker.md).  
In theory, you could download any model and use the `:full` image to convert it too, but I took the lazy road and downloaded an already converted `GGUF` model.

<!--more-->

## Download models from Hugging face

Make sure to download already compiled **GGUF** models

You can use `git` for downloading!  
Set your SSH public key under [HF settings](https://huggingface.co/settings/keys) then:

```bash
git clone git@hf.co:TheBloke/Mistral-7B-Instruct-v0.2-GGUF
```

Pull just the model you want to run with:
```bash
git lfs install
git lfs pull --include "mistral-7b-instruct-v0.2.Q8_0.gguf"
```

## Run llama.cpp server

```bash
docker run --rm -d --name llama-mistral --gpus=all -p 8000:8000 -v ~/hf-models:/models ghcr.io/ggerganov/llama.cpp:server-cuda -m /models/Mistral-7B-Instruct-v0.2-GGUF/mistral-7b-instruct-v0.2.Q8_0.gguf --port 8000 --host 0.0.0.0 --n-gpu-layers 100 --ctx-size 4096
```

See all the possible CLI params here: https://github.com/ggerganov/llama.cpp/tree/master/examples/server

Tweak `--n-gpu-layers` based on your available GPU VRAM.

That will expose a web UI at `/` to manually chat with the model and OpenAI compatible APIs at `/v1/chat/completions`