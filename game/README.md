# Installing Dependencies
1. In kalambury folder run `npm install`
2. In ws-server folder run `npm install`
3. Install needed python libraries: `pip3 install numpy`, `pip3 install pandas`, `pip3 install scikit-learn`, `pip3 install tensorflow`, `pip3 install argparse`, `pip3 install joblib`, `pip3 install torchvision`, `pip3 install torch`, `pip3 install matplotlib`, `pip3 install pillow`, `pip3 install accelerate`

# Running The Game
To run the project you need to go run these commands:
1. In ws-server folder run `npm start` to start the web socket server
2. In kalambury folder run `ng serve` to start the website

Now a browser and go to `http://localhost:4200` to play the game.

To test the game for two users the game has to be opened in two separate browsers. This is due to the use of localStorage, if it is done in one browser the game is not going to work properly.
