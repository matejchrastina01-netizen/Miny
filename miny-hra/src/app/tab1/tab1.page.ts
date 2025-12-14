import { Component, OnDestroy } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Preferences } from '@capacitor/preferences';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborCount: number;
}

const DIFFICULTIES = {
  easy: { rows: 8, cols: 8, mines: 10, label: 'Malá' },
  medium: { rows: 12, cols: 12, mines: 25, label: 'Střední' },
  hard: { rows: 16, cols: 16, mines: 40, label: 'Velká' }
};

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class Tab1Page implements OnDestroy {
  private firestore: Firestore = inject(Firestore);

  grid: Cell[] = [];
  
  currentDifficultyKey: 'easy' | 'medium' | 'hard' = 'easy';
  rows = 8;
  cols = 8;
  totalMines = 10;
  
  gameOver = false;
  gameWon = false;
  isFirstClick = true;
  flagMode = false;
  
  seconds = 0;
  timerInterval: any;

  constructor(private alertController: AlertController) {
    this.startNewGame('easy');
  }

  startNewGame(difficultyKey: 'easy' | 'medium' | 'hard') {
    this.currentDifficultyKey = difficultyKey;
    const config = DIFFICULTIES[difficultyKey];
    this.rows = config.rows;
    this.cols = config.cols;
    this.totalMines = config.mines;

    this.stopTimer();
    this.seconds = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.isFirstClick = true;
    this.grid = [];

    for (let i = 0; i < this.rows * this.cols; i++) {
      this.grid.push({ isMine: false, isRevealed: false, isFlagged: false, neighborCount: 0 });
    }
  }

  handleInteraction(index: number) {
    if (this.gameOver || this.gameWon) return;

    if (this.flagMode) {
      this.toggleFlag(index);
      return;
    }

    if (this.isFirstClick) {
      this.generateMines(index);
      this.startTimer();
      this.isFirstClick = false;
    }

    this.reveal(index);
  }

  toggleFlag(index: number) {
    if (!this.grid[index].isRevealed) {
      this.grid[index].isFlagged = !this.grid[index].isFlagged;
    }
  }

  generateMines(safeIndex: number) {
    let minesPlaced = 0;
    
    while (minesPlaced < this.totalMines) {
      const idx = Math.floor(Math.random() * this.grid.length);
      if (idx !== safeIndex && !this.grid[idx].isMine) {
        this.grid[idx].isMine = true;
        minesPlaced++;
      }
    }

    for (let i = 0; i < this.grid.length; i++) {
      if (!this.grid[i].isMine) {
        this.grid[i].neighborCount = this.countMinesAround(i);
      }
    }
  }

  countMinesAround(index: number): number {
    const row = Math.floor(index / this.cols);
    const col = index % this.cols;
    let count = 0;

    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const newRow = row + r;
        const newCol = col + c;
        if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
          const newIndex = newRow * this.cols + newCol;
          if (this.grid[newIndex].isMine) count++;
        }
      }
    }
    return count;
  }

  reveal(index: number) {
    if (this.grid[index].isFlagged || this.grid[index].isRevealed) return;

    this.grid[index].isRevealed = true;

    if (this.grid[index].isMine) {
      this.gameOver = true;
      this.stopTimer();
      this.showAlert('Prohra 💥', 'Bouchl jsi na minu!');
      this.revealAll();
    } else {
      if (this.grid[index].neighborCount === 0) {
        this.expandZero(index);
      }
      this.checkWin();
    }
  }

  expandZero(index: number) {
    const row = Math.floor(index / this.cols);
    const col = index % this.cols;

    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const newRow = row + r;
        const newCol = col + c;
        if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
          const newIndex = newRow * this.cols + newCol;
          if (!this.grid[newIndex].isRevealed && !this.grid[newIndex].isMine) {
            this.reveal(newIndex);
          }
        }
      }
    }
  }

  revealAll() {
    this.grid.forEach(c => {
      if (c.isMine) c.isRevealed = true;
    });
  }

  async checkWin() {
    const revealedCount = this.grid.filter(c => c.isRevealed).length;
    if (revealedCount === (this.rows * this.cols - this.totalMines)) {
      this.gameWon = true;
      this.gameOver = true;
      this.stopTimer();
      await this.saveScoreToFirebase();
      this.showAlert('Výhra! 🎉', `Čas: ${this.seconds} sekund`);
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.seconds++;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  async saveScoreToFirebase() {
    const { value } = await Preferences.get({ key: 'player_name' });
    const name = value || 'Neznámý hráč';

    const scoresCollection = collection(this.firestore, 'scores');
    await addDoc(scoresCollection, {
      name: name,
      time: this.seconds,
      difficulty: this.currentDifficultyKey,
      date: new Date().toISOString(),
      timestamp: Date.now()
    });
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}