import joblib
import numpy as np
from PIL import Image
import torchvision.transforms as transforms
import argparse
import drawing_util
model_filename = "best_random_forest.joblib"
model = joblib.load(model_filename)

transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((64, 64)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5], std=[0.5])
])


parser = argparse.ArgumentParser()

parser.add_argument("-j", "--json", type=str)
args = parser.parse_args()
json = args.json

drawing = drawing_util.Drawing(json,':')

labels_map = {}


image = drawing.getImage()
image = transform(image)
image = image.unsqueeze(0)
image = image.view(-1).numpy()

from sklearn.decomposition import PCA
pca = joblib.load("../KNN/pca_model.joblib")
transformed_image = image.reshape(1,-1)
transformed_image = pca.transform(transformed_image)


prediction = model.predict(transformed_image)



print(f"The label of the image is: {prediction}")
