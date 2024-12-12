import dataset
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
from sklearn.model_selection import train_test_split
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

print(X.shape)


from sklearn.decomposition import PCA
pca = joblib.load("../KNN/pca_model.joblib")
X_train_pca = pca.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(X_train_pca, y, test_size=0.2)

clf = DecisionTreeClassifier(
    criterion='gini',
    max_depth=35,
    min_samples_split=10,
    min_samples_leaf=5,
    max_features='sqrt'
)
    
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)

print(f"Best Test Accuracy: {accuracy * 100:.2f}%")

model_filename = f"decision_tree.joblib"
joblib.dump(clf, model_filename)
