import torch
import torch.nn as nn

class Discriminator(nn.Module):
    def __init__(self):
        super(Discriminator, self).__init__()
        self.image_input = nn.Sequential(
            nn.Conv2d(in_channels=1, out_channels=32, kernel_size=4, stride=2, padding=1, bias=False),
            nn.LeakyReLU(0.2, inplace=True))

        self.label_input = nn.Sequential(
            nn.Conv2d(in_channels=10, out_channels=32, kernel_size=4, stride=2, padding=1, bias=False),
            nn.LeakyReLU(0.2, inplace=True))

        self.merged = nn.Sequential(
            nn.Conv2d(in_channels=64, out_channels=128, kernel_size=4, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(in_channels=128, out_channels=256, kernel_size=3, stride=2, padding=0, bias=False),
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(in_channels=256, out_channels=1, kernel_size=3, stride=1, padding=0, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x, y):
      x = self.image_input(x)
      y = self.label_input(y)
      xy = torch.cat([x, y], dim=1)
      xy = self.merged(xy)
      xy = xy.view(xy.shape[0], -1)
      return xy


class Generator(nn.Module):
    def __init__(self):

        super(Generator, self).__init__()
        self.noise_input = nn.Sequential(
            nn.ConvTranspose2d(in_channels=100, out_channels=128, kernel_size=3, stride=1, padding=0, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU())

        self.label_input = nn.Sequential(
            nn.ConvTranspose2d(in_channels=10, out_channels=128, kernel_size=3, stride=1, padding=0, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU())

        self.merged = nn.Sequential(
            nn.ConvTranspose2d(in_channels=256, out_channels=128, kernel_size=3, stride=2, padding=0, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.ConvTranspose2d(in_channels=128, out_channels=64, kernel_size=4, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.ConvTranspose2d(in_channels=64, out_channels=1, kernel_size=4, stride=2, padding=1, bias=False),
            nn.Tanh())

    def forward(self, x, y):
        x = x.view(x.shape[0], x.shape[1], 1, 1)
        x = self.noise_input(x)
        y = y.view(y.shape[0], y.shape[1], 1, 1)
        y = self.label_input(y)
        xy = torch.cat([x, y], dim=1)
        xy = self.merged(xy)
        return xy