import torch
import torch.nn as nn
import torchvision
from torch.utils.data import DataLoader
from dataset import CustomImageDataset
import numpy as np
import matplotlib.pyplot as plt
import os
from architecture import Generator, Discriminator

BATCH_SIZE = 128
num_epoches = 100
z = 100
lr = 0.0002
beta = 0.5
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
os.makedirs('./gen_model', exist_ok=True)

# Data preparation
transform = torchvision.transforms.Compose([
    torchvision.transforms.Grayscale(num_output_channels=1),
    torchvision.transforms.Resize((28,28)),
    torchvision.transforms.ToTensor(),
    torchvision.transforms.Normalize(mean=(0.5,), std=(0.5,))
])

data = CustomImageDataset("./png/train/labels.csv","./png/train/", transform)
dataloader = DataLoader(data, batch_size = 128, shuffle=True, drop_last=True)

# Training data visualization
data_iter = iter(dataloader)
images, labels = next(data_iter)
img = images[0].permute(1, 2, 0).numpy()
plt.imshow(img)
plt.title(f"Label: {labels[0].item()}")
plt.axis("off")
plt.show()

# Weights initialization based on DCGAN article
def weights_init(net):
    classname = net.__class__.__name__
    if classname.find('Conv') != -1:
        nn.init.normal_(net.weight.data, 0.0, 0.02)
    elif classname.find('BatchNorm') != -1:
        nn.init.normal_(net.weight.data, 1.0, 0.02)
        nn.init.constant_(net.bias.data, 0)


# Models creation
discriminator = Discriminator().to(DEVICE)
generator = Generator().to(DEVICE)
discriminator.apply(weights_init)
generator.apply(weights_init)

# Loss function
criterion = nn.BCELoss()
optimizer_gen = torch.optim.Adam(generator.parameters(), lr=lr, betas=(beta, 0.999))
optimizer_disc = torch.optim.Adam(discriminator.parameters(), lr=lr, betas=(beta, 0.999))

# Input preparation
one_hot_vector = torch.zeros(10, 10, device=DEVICE).scatter_(1, torch.arange(10, device=DEVICE).view(10, 1), 1)
fill = torch.zeros([10, 10, 28, 28]).to(DEVICE)
for i in range(10):
    fill[i, i, :, :] = 1


def discrimiantor_training(discriminator, images, labels, fake_images, labels_d):
    # Real data
    real_predict = discriminator(images, labels)
    real_loss = criterion(real_predict, torch.ones((BATCH_SIZE, 1)).to(DEVICE))

    # Fake data
    fake_predict = discriminator(fake_images.detach(), labels_d)
    fake_loss = criterion(fake_predict, torch.zeros((BATCH_SIZE, 1)).to(DEVICE))

    disc_loss = real_loss + fake_loss
    discriminator.zero_grad()
    disc_loss.backward()
    optimizer_disc.step()
    return disc_loss.item()


def generator_training(discriminator, fake_images, labels_d):
    pred = discriminator(fake_images, labels_d)
    gen_loss = criterion(pred, torch.ones((BATCH_SIZE, 1)).to(DEVICE))

    generator.zero_grad()
    gen_loss.backward()
    optimizer_gen.step()
    return gen_loss.item()

# Test data
test_z = torch.randn(100, z).to(DEVICE)
test_y = torch.tensor([0, 1, 2, 3, 4,5,6,7,8,9]*10).type(torch.LongTensor)
test_labels = one_hot_vector[test_y].to(DEVICE)

# Lists for visualization
Disc_losses = []
Gen_losses = []

# Training loop
for epoch in range(num_epoches):
    epoch_Disc_losses = []
    epoch_Gen_losses = []

    for images, y_labels in dataloader:
        real_img = images.to(DEVICE)
        labels = fill[y_labels].to(DEVICE)
        
        noise = torch.randn(BATCH_SIZE, z).to(DEVICE)
        labels_random = torch.randint(0, 10, (BATCH_SIZE,), dtype=torch.long).to(DEVICE)
        labels_g = one_hot_vector[labels_random].to(DEVICE)
        labels_d = fill[labels_random].to(DEVICE)
        fake_images = generator(noise, labels_g)
        
        discriminator_loss = discrimiantor_training(discriminator, real_img, labels, fake_images, labels_d)
        epoch_Disc_losses.append(discriminator_loss)
        generator_loss = generator_training(discriminator, fake_images, labels_d)
        epoch_Gen_losses.append(generator_loss)

    # Calculation of the average value for one epoch
    Disc_losses.append(sum(epoch_Disc_losses) / len(epoch_Disc_losses))
    Gen_losses.append(sum(epoch_Gen_losses) / len(epoch_Gen_losses))

    print(f" Epoch number: {epoch + 1}/{num_epoches} Discriminator Loss: {Disc_losses[-1]:.3f} Generator Loss: {Gen_losses[-1]:.3f}")

    # Generator testing
    generator.eval()
    with torch.no_grad():
        test_fake_images = generator(test_z, test_labels).cpu()
        torchvision.utils.save_image(test_fake_images, f"Generated_epoch_{epoch + 1}.jpg", nrow=10, padding=0, normalize=True)

    # Saving generator model
    torch.save(generator, f'./gen_model/checkpoint-{epoch}.pth')
    generator.train()

# Loss function plot
plt.figure(figsize=(10,5))
plt.title("Discriminator and Generator Losses over time")
plt.plot(Disc_losses,label="D Loss")
plt.plot(Gen_losses,label="G Loss")
plt.xlabel("num_epochs")
plt.legend()
plt.show()