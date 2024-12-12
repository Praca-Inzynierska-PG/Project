import os
import pandas as pd
from torch.utils.data import Dataset
from PIL import Image
import torchvision.transforms as transforms

class CustomImageDataset(Dataset):
    def __init__(self, annotations_file, img_dir, transform=None, target_transform=None):
        self.img_labels = pd.read_csv(annotations_file)
        self.img_dir = img_dir
        self.transform = transform
        self.target_transform = target_transform

    def __len__(self):
        return len(self.img_labels)

    def __getitem__(self, idx):
        img_path = os.path.join(self.img_dir, self.img_labels.iloc[idx, 0])
        image = Image.open(img_path)
        label = self.img_labels.iloc[idx, 1]
        if self.transform:
            image = self.transform(image)
        if self.target_transform:
            label = self.target_transform(label)
        return image, label


class SklearnDataset(Dataset):
    def __init__(self, annotations_file, img_dir, image_size=(64, 64), augment=False):
        self.img_labels = pd.read_csv(annotations_file)
        self.img_dir = img_dir
        self.image_size = image_size
        self.augment = augment
        
        self.base_transform = transforms.Compose([
            transforms.Grayscale(num_output_channels=1),
            transforms.Resize(self.image_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])
        
        self.augmentation_transform = transforms.Compose([
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15)
        ])

    def __len__(self):
        return len(self.img_labels)

    def __getitem__(self, idx):
        img_path = os.path.join(self.img_dir, self.img_labels.iloc[idx, 0])
        image = Image.open(img_path)
        label = self.img_labels.iloc[idx, 1]
        image = self.base_transform(image)
        
        if self.augment:
            image = self.augmentation_transform(image)
        
        image = image.view(-1).numpy()
        return image, label
