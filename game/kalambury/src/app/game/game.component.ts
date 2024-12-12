import { Component, ElementRef, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { fromEvent } from "rxjs";
import { switchMap, takeUntil, pairwise } from "rxjs/operators";
import { Position } from '../models/position';
import { WebSocketService } from '../services/web-socket-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements AfterViewInit, OnInit {
  @ViewChild("canvas") public canvas: ElementRef<HTMLCanvasElement> | undefined;
  private c: CanvasRenderingContext2D | null = null;
  private strokeHistory: number[][][] = [];
  word: string = "";
  messages: string[] = [];
  guessInput: string = "";
  roomId: string = "";
  username: string = null;
  players: {username: string, score: number}[] = [];
  showCounter: boolean = false;
  count: number = 8;
  activeView: number = 0;
  generator: boolean = true;
  difficultyLevel: number;
  generatorMode: number;
  words: string[] = ['chair', 'campfire', 'apple', 'shorts', 'square', 'sun', 'snail', 'carrot', 'spider', 'cat', 'bee', 'cookie', 'crown', 'triangle', 'car', 'bicycle'];
  wordSelected: string = '';

  constructor(private ws: WebSocketService, private route: ActivatedRoute, private router: Router, private http: HttpClient) {}

  public ngAfterViewInit() {
    const canvasElement: HTMLCanvasElement = this.canvas!.nativeElement;
    this.c = canvasElement.getContext("2d");
    this.c!.lineWidth = 3;
    this.c!.lineCap = "round";
    this.c!.strokeStyle = "#000";
    this.captureEvents(canvasElement);

    if (this.generator) {
      this.ws.onRoomJoined().subscribe((gameState: any) => {
        this.players = gameState.players;
      });
  
      this.ws.onNewGuess().subscribe(({ username, guess }) => {
        this.messages.push(`${username}: ${guess}`);
      });
  
      this.ws.onCorrectGuess().subscribe(({ username, scores, currentWord }) => {
        this.messages.push(`${username} guessed correctly! The word was ${currentWord}.`);
        this.players = scores;
        this.showCounter = true;
        localStorage.setItem('continuing', 'true');
        if (username == "ai") {
          localStorage.setItem('ai', 'true');
        } else {
          this.saveImage();
        }
        // timer to start a new game
        const interval = setInterval(() => {
          this.count--;
          if (this.count === 0) {
            clearInterval(interval);
            this.showCounter = false;
            this.count = 8;
            this.strokeHistory = [];
            this.clearCanvas();
            this.router.navigateByUrl('/viewer/' + this.roomId);
            if (localStorage.getItem('word') !== null) {
              localStorage.removeItem('word');
            }
          }
        }, 1000);
      });
  
      this.ws.onPlayerJoined().subscribe((username: string) => {
        this.messages.push(`${username} joined the room.`);
      });
  
      this.ws.onPlayerLeft().subscribe((socketId: string) => {
        this.messages.push(`A player left the room.`);
      });
  
      this.ws.onGameStarted().subscribe((word: string) => {
        this.word = word;
        this.wordSelected = word;
      });
    }
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.roomId = params['id'];
    });
    this.username = localStorage.getItem('username');
    if (localStorage.getItem('continuing') !== null && 
        localStorage.getItem('continuing') === 'true') 
    {
      localStorage.removeItem('continuing');
      this.word = localStorage.getItem('word');
      this.wordSelected = this.word;
    } else {
      this.difficultyLevel = parseInt(localStorage.getItem('difficultyLevel'));
      this.generatorMode = parseInt(localStorage.getItem('generatorMode'));
      localStorage.removeItem('difficultyLevel');
      localStorage.removeItem('generatorMode');
      this.ws.joinRoom(this.roomId, this.username);
      this.startGame();
    }
    if (localStorage.getItem('yourTurn') === 'true') {
      this.messages.push('It is your turn to draw!');
      localStorage.removeItem('yourTurn');
    }
  }

  startGame(): void {
    this.ws.startGame(this.roomId, this.difficultyLevel, this.generatorMode);
  }

  private captureEvents(canvasElement: HTMLCanvasElement): void {
    fromEvent(canvasElement, "mousedown")
      .pipe(
        switchMap((e) => {
          const currentStroke: number[][] = [[], []]; // [x, y, t]
          this.strokeHistory.push(currentStroke);
          return fromEvent(canvasElement, "mousemove").pipe(
            takeUntil(fromEvent(canvasElement, "mouseup")),
            takeUntil(fromEvent(canvasElement, "mouseleave")),
            pairwise()
          );
        })
      )
      .subscribe((res: [MouseEvent, MouseEvent]) => {
        const rect = canvasElement.getBoundingClientRect();

        const prevPos = {
          x: res[0].clientX - rect.left,
          y: res[0].clientY - rect.top,
        };

        const currentPos = {
          x: res[1].clientX - rect.left,
          y: res[1].clientY - rect.top,
        };

        const currentStroke = this.strokeHistory[this.strokeHistory.length - 1];
        currentStroke[0].push(prevPos.x, currentPos.x);
        currentStroke[1].push(prevPos.y, currentPos.y);

        this.draw(prevPos, currentPos);
        this.ws.sendDrawing(this.roomId, this.strokeHistory);
      });
  }

  private draw(previousPos: Position, currentPos: Position): void {
    if (!this.c || !previousPos) return;

    this.c.beginPath();
    this.c.moveTo(previousPos.x, previousPos.y);
    this.c.lineTo(currentPos.x, currentPos.y);
    this.c.stroke();
  }

  public clearCanvas(): void {
    if (!this.c || !this.canvas) return;
    this.c.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    this.strokeHistory = [];
    this.ws.sendDrawing(this.roomId, this.strokeHistory);
  }

  imageClassification(): void {
    this.http.post('http://34.118.123.122:8080/guess', { data: this.strokeHistory, roomId: this.roomId }).subscribe((data: any) => {
      if (data.response.length > 0 && !this.showCounter) {
        this.ws.sendGuess(this.roomId, data.response.trim(), "ai");
      }
    });
  }

  saveImage(): void {
    if (this.strokeHistory.length === 0) return;
    this.http.post('http://34.118.123.122:8080/save-drawing/', { data: this.strokeHistory, word: this.word }).subscribe();
  }

  getPlayerScores() {
    this.http.get('http://34.118.123.122:8080/get-scores/' + this.roomId)
             .subscribe((data: {response: {username: string, score: number}[]}) => this.players = data.response);
  }

  changeWord() {
    this.http.post('http://34.118.123.122:8080/set-word' + this.roomId, { word: this.wordSelected }).subscribe((data: any) => {
      if (data.response == 'success') {
        this.word = this.wordSelected;
      }
    });
  }

}
