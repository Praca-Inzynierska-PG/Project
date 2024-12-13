from diffusers import StableDiffusionPipeline, DDPMScheduler
import torch
import sys

word = str(sys.argv[1])
directory = "drawings/" + sys.argv[2]
file_path = directory + "/image.png"


# remove a file in a direcotry if the file exists
import os
if os.path.exists(file_path):
    os.remove(file_path)

os.makedirs(directory, exist_ok=True)
 
pipe = StableDiffusionPipeline.from_pretrained("CompVis/stable-diffusion-v1-4", variant="fp16", torch_dtype=torch.float16)
pipe.to("cuda") # for Winows
#  pipe.to("mps") # for macOS
prompt = "A simple black and white outline of a " + word + " with no shading drawn in ms paint with nothing inside, make it look like someting drawn in charades game."
scheduler = DDPMScheduler(beta_start=0.00085, beta_end=0.012,
                          beta_schedule="scaled_linear")
image = pipe(
    prompt,
    scheduler=scheduler,
    num_inference_steps=30,
    guidance_scale=7.5,
).images[0]

image.save(file_path)
