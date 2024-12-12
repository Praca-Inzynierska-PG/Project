import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent implements OnInit {

  gameCode: string = '';
  username: string = '';
  difficultyLevel: number = 0;
  generatorMode: number = 0;

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit(): void {
    localStorage.removeItem('username');
    localStorage.removeItem('word');
    localStorage.removeItem('difficultyLevel');
    localStorage.removeItem('generatorMode');
    localStorage.removeItem('continuing');
    localStorage.removeItem('ai');
    localStorage.removeItem('yourTurn');
  }

  joinGame() {
    if (this.username.length > 2) {
      this.http.post('http://34.118.123.122:8080/room-exists/' + this.gameCode, { username: this.username }).subscribe((data: {response: boolean}) => {
        if (data.response) {
          this.setUsername();
          this.router.navigateByUrl('/viewer/' + this.gameCode);
        }
      });
    }
  }

  startGame() {
    if (this.username.length > 2) {
      this.http.get('http://34.118.123.122:8080/generate-room-id').subscribe((data: {response: string}) => {
        this.setUsername();
        this.setDifficultyLevel();
        this.router.navigateByUrl('/drawing/' + data.response);
      });
    }
  }

  private setUsername() {
    localStorage.setItem('username', this.username);
  }

  private setDifficultyLevel() {
    localStorage.setItem('difficultyLevel', this.difficultyLevel.toString());
    localStorage.setItem('generatorMode', this.generatorMode.toString());
  }

}
