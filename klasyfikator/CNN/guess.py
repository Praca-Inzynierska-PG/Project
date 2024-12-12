# 
# SCRIPT TAKES AS INPUT A JSON FILE REPRESENTING STROKE COORDINATES AS EXPLAINED IN THE QUICKDRAW DATASET AND OUTPUTS A GUESS TO CONSOLE
#

import argparse
import drawing_util
import torch
import torch.nn as nn
import torchvision
from torch.utils.data import Dataset, DataLoader
from dataset import CustomImageDataset
import numpy as np
import matplotlib.pyplot as plt
import os
parser = argparse.ArgumentParser()

parser.add_argument("-j", "--json", type=str)
args = parser.parse_args()
json = args.json

drawing = drawing_util.Drawing(json,':')

import torchvision
transform = torchvision.transforms.Compose([
    torchvision.transforms.Grayscale(num_output_channels=1),
    torchvision.transforms.Resize((32,32)),
    torchvision.transforms.ToTensor(),
])

image = drawing.getImage()
image = transform(image)
image = image.unsqueeze(0)

import network
import torch
net = network.Net()
net.load_state_dict(torch.load("./network.net", weights_only=True))

net.eval()

with torch.no_grad():
    outputs = net(image)
    _, predicted = torch.max(outputs.data, 1)
print(predicted.item())
