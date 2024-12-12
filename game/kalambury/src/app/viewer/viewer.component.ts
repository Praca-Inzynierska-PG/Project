import { Component, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { WebSocketService } from '../services/web-socket-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { generate } from 'rxjs';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss']
})
export class ViewerComponent implements OnInit {

  @ViewChild("canvas") public canvas: ElementRef<HTMLCanvasElement> | undefined;
  public drawingData: number[][][] = [];
  private c: CanvasRenderingContext2D | null = null;
  messages: string[] = [];
  guessInput: string = "";
  roomId: string = "";
  username: string = "";
  showCounter: boolean = false;
  count: number = 8;
  correctGuess: boolean = false;
  aiDrawing: boolean = false;
  imageUrl: string = null;
  players: {username: string, score: number}[] = [];
  activeView: number = 0;

  public revealedPieces: string[] = new Array(16).fill(''); // Store each piece as a base64 image
  public revealedIndices: boolean[] = new Array(16).fill(false); // Track which pieces are revealed
  private timer: any;

  constructor(private ws: WebSocketService, private route: ActivatedRoute, private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.roomId = params['id'];
    });
    this.username = localStorage.getItem('username');
    if (localStorage.getItem('continuing') !== null && localStorage.getItem('continuing') === 'true') {
      localStorage.removeItem('continuing');
    } else {
      this.ws.joinRoom(this.roomId, this.username);
    }
    if (localStorage.getItem('ai') !== null && localStorage.getItem('ai') === 'true') {
      localStorage.removeItem('ai');
      this.aiDrawing = true;
    }
    if (this.aiDrawing) {
      this.downloadImage();
    }

    this.ws.getMessages().subscribe((data: number[][][]) => {
      this.drawingData = data;
      this.redraw();
    });

    this.ws.onNewGuess().subscribe(({ username, guess }) => {
      this.messages.push(`${username}: ${guess}`);
    });

    this.ws.onRoomJoined().subscribe((turn) => {
      if (turn === 'ai') {
        this.aiDrawing = true;
        this.downloadImage();
      }
    });
    
    this.ws.onYourTurn().subscribe(({ word }) => {
      localStorage.setItem('word', word);
      localStorage.setItem('continuing', 'true');
      localStorage.setItem('yourTurn', 'true');
      this.router.navigateByUrl('/drawing/' + this.roomId);
      this.showCounter = false;
      this.correctGuess = false;
      this.count = 8;
      this.drawingData = [];
      this.imageUrl = null;
      this.revealedIndices = new Array(16).fill(false);
      this.revealedPieces = new Array(16).fill('');
      this.redraw();
    });

    this.ws.onCorrectGuess().subscribe(({ username, scores, currentWord }) => {
      this.messages.push(`${username} guessed correctly! The word was ${currentWord}.`);
      this.showCounter = true;
      localStorage.setItem('continuing', 'true');
      if (username == "ai") {
        this.aiDrawing = true;
        this.downloadImage();
      } else {
        this.aiDrawing = false;
      }
      if (username === this.username) {
        this.correctGuess = true;
      }
      // timer to start a new game
      const interval = setInterval(() => {
        this.count--;
        if (this.count === 0) {
          clearInterval(interval);
          if (this.correctGuess) {
            this.router.navigateByUrl('/drawing/' + this.roomId);
          }
          this.showCounter = false;
          this.correctGuess = false;
          this.count = 8;
          this.drawingData = [];
          this.imageUrl = null;
          this.revealedIndices = new Array(16).fill(false);
          this.revealedPieces = new Array(16).fill('');
          this.redraw();
          if (username = "ai") {
            this.downloadImage();
          }
        }
      }, 1000);
    });
  }

  ngAfterViewInit() {
    this.initCanvas();
  }

  private initCanvas(): void {
    const canvasElement: HTMLCanvasElement = this.canvas!.nativeElement;
    this.c = canvasElement.getContext("2d");
    this.c!.lineWidth = 3;
    this.c!.lineCap = "round";
    this.c!.strokeStyle = "#000";
  }

  private redraw(): void {
    if (!this.c || !this.canvas) return;

    // Clear the canvas
    this.c.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

    // Redraw from the drawing data
    for (const stroke of this.drawingData) {
      const xPoints = stroke[0];
      const yPoints = stroke[1];

      this.c.beginPath();
      this.c.moveTo(xPoints[0], yPoints[0]);

      for (let i = 1; i < xPoints.length; i++) {
        this.c.lineTo(xPoints[i], yPoints[i]);
      }

      this.c.stroke();
    }
  }

  guess(): void {
    if (this.guessInput.length > 0) {
      if (!this.showCounter) {
        this.ws.sendGuess(this.roomId, this.guessInput.trim(), this.username);
      }
      this.guessInput = "";
    }
  }

  downloadImage(): void {
    this.http.get('http://34.118.123.122:8080/download-image/' + this.roomId, { responseType: 'blob' }).subscribe((blob) => {
      if (blob.size > 0) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          this.imageUrl = event.target.result;
          this.splitImage(this.imageUrl);
        };
        reader.readAsDataURL(blob);
      } else {
        setTimeout(() => {
          this.downloadImage();
        }, 5000);
      }
    });
  }

  private splitImage(imageUrl: string): void {
    const image = new Image();
    image.src = imageUrl;

    image.onload = () => {
      const pieces = 4; // 4x4 grid
      const pieceWidth = image.width / pieces;
      const pieceHeight = image.height / pieces;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = pieceWidth;
      canvas.height = pieceHeight;

      for (let y = 0; y < pieces; y++) {
        for (let x = 0; x < pieces; x++) {
          context?.clearRect(0, 0, pieceWidth, pieceHeight);
          context?.drawImage(image, x * pieceWidth, y * pieceHeight, pieceWidth, pieceHeight, 0, 0, pieceWidth, pieceHeight);

          const base64Image = canvas.toDataURL();
          const pieceIndex = y * pieces + x;
          this.revealedPieces[pieceIndex] = base64Image;
        }
      }
      this.revealing();
    };
  }

  private revealing(): void {
    let index: number = 0;
    let revealed: number[] = [];
    this.timer = setInterval(() => {
      if (!this.showCounter) {
        if (revealed.length == this.revealedIndices.length) {
          clearInterval(this.timer);
          return;
        }
        while (revealed.includes(index)) {
          index = Math.floor(Math.random() * 16);
        }
        revealed.push(index);
        this.revealedIndices[index] = true;
      } 
    }, 1000);
  }

  getPlayerScores() {
    this.http.get('http://34.118.123.122:8080/get-scores/' + this.roomId)
             .subscribe((data: {response: {username: string, score: number}[]}) => this.players = data.response);
  }

}
