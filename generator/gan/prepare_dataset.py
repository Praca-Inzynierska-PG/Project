import os
import csv
import random
import argparse

import drawing_util


parser = argparse.ArgumentParser()

#Size of the created dataset. If left empty the entire json will be converted to images.
parser.add_argument("-s", "--size", type=int)
parser.add_argument("-tr", "--train_size", nargs='?', type=float, const=0.9)
parser.add_argument("-te", "--test_size", nargs='?', type=float, const=0.1)
args = parser.parse_args()
dataset_size = args.size
train_size_percent = args.train_size
test_size_percent =  args.test_size

label_dict = {}

train_size_percent = 0.8 
test_size_percent =  1 - train_size_percent

json_dir = f"./json"
train_dir = f"./png/train/"
test_dir = f"./png/test/"

if not os.path.exists(train_dir):
    os.makedirs(train_dir)

if not os.path.exists(test_dir):
    os.makedirs(test_dir)

for file in os.scandir(json_dir):
    with open(file) as text:
        i = 0
        for line in text:
            if dataset_size < i:
                break

            if random.random() < train_size_percent:
                csv_dir= f'{train_dir}labels.csv'
                image_dir = "train"
            else:
                csv_dir = f'{test_dir}labels.csv'
                image_dir = "test"
            with open(csv_dir, 'a', newline='') as csv_file:
                
                drawing = drawing_util.Drawing(line,'"')
                drawing.convert(i,image_dir)

                if drawing.label not in label_dict:
                    label_dict[drawing.label] = len(label_dict)
                writer = csv.writer(csv_file)
                row = [drawing.name,label_dict[drawing.label]]
                writer.writerow(row)
                i += 1
print(label_dict)
