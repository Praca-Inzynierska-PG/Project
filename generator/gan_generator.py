import torch
import argparse
import os
from torchvision.transforms import ToPILImage
from super_image import EdsrModel, ImageLoader
from PIL import Image

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

parser = argparse.ArgumentParser()
parser.add_argument("-c", "--class_number", type=int, required=True)
parser.add_argument("-o", "--output_folder", type=str, required=True)
args = parser.parse_args()
class_num = args.class_number
folder = args.output_folder

noise = torch.randn(1, 100).to(DEVICE)
onehot = torch.zeros(10, 10, device=DEVICE).scatter_(1, torch.arange(10, device=DEVICE).view(10, 1), 1)
class_selected= torch.tensor([class_num]).type(torch.LongTensor)
label = onehot[class_selected].to(DEVICE)

PATH = "./generator.pth"
model = torch.load(PATH)
model.eval()
image = model(noise, label).cpu()

#Resize
to_pil = ToPILImage()
image_pil = to_pil(image.squeeze(0)) 
image_resized = image_pil.resize((300, 300), Image.BILINEAR)

#Upscale
model = EdsrModel.from_pretrained('eugenesiow/edsr-base', scale=4)
inputs = ImageLoader.load_image(image_resized)
preds = model(inputs)

if not os.path.exists(folder):
    os.makedirs(folder)
output_path = os.path.join(folder, f"class_{class_num}.png")
ImageLoader.save_image(preds, output_path)
ImageLoader.save_compare(inputs, preds, './scaled_4x_compare.png')















