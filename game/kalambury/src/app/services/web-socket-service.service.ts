import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://34.118.123.122:8080');
  }

  getMessages(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('drawing', (data) => {
        observer.next(data);
      });
    });
  }

  joinRoom(roomId: string, username: string) {
    this.socket.emit('joinRoom', roomId, username);
  }

  onRoomJoined(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('roomJoined', (turn) => {
        observer.next(turn);
      });
    });
  }

  startGame(roomId: string, difficultyLevel: number, generatorMode: number) {
    this.socket.emit('startGame', roomId, difficultyLevel, generatorMode);
  }

  onGameStarted(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('gameStarted', (word) => {
        observer.next(word);
      });
    });
  }

  sendDrawing(roomId: string, data: number[][][]) {
    this.socket.emit('drawing', roomId, data);
  }

  onDrawing(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('drawing', (data) => {
        observer.next(data);
      });
    });
  }

  sendGuess(roomId: string, guess: string, username: string) {
    this.socket.emit('guess', roomId, guess, username);
  }

  onNewGuess(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('newGuess', (username, guess) => {
        observer.next({ username, guess });
      });
    });
  }

  onCorrectGuess(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('correctGuess', (username, scores, currentWord) => {
        observer.next({ username, scores, currentWord });
      });
    });
  }

  onPlayerJoined(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('playerJoined', (username) => {
        observer.next(username);
      });
    });
  }

  onPlayerLeft(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('playerLeft', (socketId) => {
        observer.next(socketId);
      });
    });
  }

  onYourTurn(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('yourTurn', (word) => {
        observer.next({ word });
      });
    });
  }

  onChangeTurn(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('changeTurn', (newWord, username) => {
        observer.next({ newWord, username });
      });
    });
  }

  close() {
    this.socket.disconnect();
  }
}
