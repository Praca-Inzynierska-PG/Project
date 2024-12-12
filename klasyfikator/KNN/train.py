import dataset
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.decomposition import PCA
from collections import Counter
import joblib

annotations_file = "../data/png/train/labels.csv"
img_dir = "../data/png/train/"

dataset_test = dataset.SklearnDataset(annotations_file, img_dir, image_size=(64, 64), augment=True)

images = []
labels = []
for i in range(len(dataset_test)):
    image, label = dataset_test[i]
    images.append(image)
    labels.append(label)

X = np.array(images)
y = np.array(labels)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

pca = PCA(n_components=50)
X_train = pca.fit_transform(X_train)
X_test = pca.transform(X_test)

joblib.dump(pca, "pca_model.joblib")

best_accuracy = 0
best_k = 5

clf = KNeighborsClassifier(
    n_neighbors=5,
    weights='distance',
    metric='manhattan'
)

clf.fit(X_train, y_train)
y_pred = clf.predict(X_test)

best_accuracy = accuracy_score(y_test, y_pred)
model_filename = "best_KNN_model_new.joblib"
joblib.dump(clf, model_filename)
print(f"Best Model (k=5) with accuracy {best_accuracy * 100:.2f}%")

