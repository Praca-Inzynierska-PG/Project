import torch
import torchvision
from torch.utils.data import DataLoader


# Setting definition

transform = torchvision.transforms.Compose([
    torchvision.transforms.Grayscale(num_output_channels=1),
    torchvision.transforms.Resize((32,32)),
    torchvision.transforms.ToTensor(),
])

batch_size = 128
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Data preprocessing

import dataset
training_data = dataset.CustomImageDataset("../data/png/train/labels.csv","../data/png/train/",transform=transform)
test_data = dataset.CustomImageDataset("../data/png/test/labels.csv","../data/png/test/",transform)

train_dataloader = DataLoader(training_data, batch_size=batch_size, shuffle=True, num_workers=6)
test_dataloader = DataLoader(test_data, batch_size=batch_size, shuffle=True, num_workers=4)



# Network definition

import network
net = network.Net().to(device)

import torch.optim as optim
import torch.nn as nn
criterion = nn.CrossEntropyLoss()
optimizer = optim.SGD(net.parameters(), lr=0.001, momentum=0.9)


# Training loop

print("Starting training")
for epoch in range(100):
    running_loss = 0.0
    for i, data in enumerate(train_dataloader, 0):
        inputs, labels = data[0].to(device), data[1].to(device)
        optimizer.zero_grad()
        outputs = net(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()
        if i % 2000 == 1999:
            print(f'[{epoch + 1}, {i + 1}] loss: {running_loss / 2000:.3f}')
            running_loss = 0.0

print('Finished Training')
torch.save(net.state_dict(), "./network_newest.net")
