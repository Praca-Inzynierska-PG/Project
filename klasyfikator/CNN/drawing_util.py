from PIL import Image, ImageDraw
import ast
import os

class Drawing:
    name = ""
    def __init__(self, label, coordinates) -> None:
        self.label = label
        self.coordinates = coordinates
    def __init__(self,json,split) -> None:
        self.coordinates = self.parseCoord(json,split)
        if split != ':':
            self.label = self.parseName(json)

    def parseCoord(self,json,split):
        try:
            divided = json.rstrip().split(split)
            coord = divided[-1].strip()
            if coord.startswith("[") and coord.endswith("]"):
                return ast.literal_eval(coord)
            else:
                raise ValueError("Wrong coordinates")
        except (SyntaxError, ValueError) as e:
            print(f"Error parsing coordinates: {e}")
            return []

    def parseName(self,json):
        divided = json.split('"')
        name = divided[3]
        return name

    def display(self):
        image_size = (256,256)
        image = Image.new("RGB", image_size, "white")
        draw = ImageDraw.Draw(image)
        for stroke in self.coordinates:
            x,y = stroke
            for i in range(len(x) - 1):
                start = (x[i],y[i])
                end = (x[i+1],y[i+1])
                draw.line([start,end], fill="black", width=3)
        image.show()
    
    def convert(self,name,extra_path):
        image_size = (256,256)
        image = Image.new("RGB", image_size, "white")
        draw = ImageDraw.Draw(image)
        for stroke in self.coordinates:
            x,y = stroke
            for i in range(len(x) - 1):
                start = (x[i],y[i])
                end = (x[i+1],y[i+1])
                draw.line([start,end], fill="black", width=3)
        path = f"./png/{extra_path}/" 
        if not os.path.exists(path):
            os.makedirs(path)
        self.name = f"{self.label}_{name}.png"
        image.save(f"{path}{self.label}_{name}.png")

    def getImage(self):
        image_size = (256,256)
        image = Image.new("RGB", image_size, "white")
        draw = ImageDraw.Draw(image)
        for stroke in self.coordinates:
            x,y = stroke
            for i in range(len(x) - 1):
                start = (x[i],y[i])
                end = (x[i+1],y[i+1])
                draw.line([start,end], fill="black", width=3)
        return image
