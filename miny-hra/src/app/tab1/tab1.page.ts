import { Component, OnDestroy } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Preferences } from '@capacitor/preferences';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Definice struktury jednoho políčka
interface Cell {
  isMine: boolean;      // Je to mina?
  isRevealed: boolean;  // Je odkryté?
  isFlagged: boolean;   // Má vlaječku?
  neighborCount: number;// Počet min okolo
}

// Konfigurace obtížností (rozměry a počet min)
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
  private firestore: Firestore = inject(Firestore); // Injektování Firebase služby

  grid: Cell[] = []; // Hlavní herní pole
  
  // Nastavení výchozí obtížnosti
  currentDifficultyKey: 'easy' | 'medium' | 'hard' = 'easy';
  rows = 8;
  cols = 8;
  totalMines = 10;
  
  // Stavové proměnné hry
  gameOver = false;
  gameWon = false;
  isFirstClick = true; // Pojistka pro bezpečný první klik
  flagMode = false;    // Přepínač režimu "Vlajka"
  
  seconds = 0;
  timerInterval: any;

  constructor(private alertController: AlertController) {
    this.startNewGame('easy'); // Spustí hru při startu
  }

  // Funkce pro reset a nastavení nové hry
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

    // Vytvoření prázdné mřížky (miny se generují až po kliknutí)
    for (let i = 0; i < this.rows * this.cols; i++) {
      this.grid.push({ isMine: false, isRevealed: false, isFlagged: false, neighborCount: 0 });
    }
  }

  // Hlavní reakce na kliknutí uživatele
  handleInteraction(index: number) {
    if (this.gameOver || this.gameWon) return;

    // Pokud je zapnutý režim vlajek
    if (this.flagMode) {
      this.toggleFlag(index);
      return;
    }

    // Pokud je to první kliknutí, vygeneruj miny (aby nebyla mina pod prstem)
    if (this.isFirstClick) {
      this.generateMines(index);
      this.startTimer();
      this.isFirstClick = false;
    }

    this.reveal(index);
  }

  // Přidání/odebrání vlaječky
  toggleFlag(index: number) {
    if (!this.grid[index].isRevealed) {
      this.grid[index].isFlagged = !this.grid[index].isFlagged;
    }
  }

  // Rozmístění min (vynechá safeIndex - místo prvního kliku)
  generateMines(safeIndex: number) {
    let minesPlaced = 0;
    
    while (minesPlaced < this.totalMines) {
      const idx = Math.floor(Math.random() * this.grid.length);
      if (idx !== safeIndex && !this.grid[idx].isMine) {
        this.grid[idx].isMine = true;
        minesPlaced++;
      }
    }

    // Spočítání čísel okolo min pro celou mřížku
    for (let i = 0; i < this.grid.length; i++) {
      if (!this.grid[i].isMine) {
        this.grid[i].neighborCount = this.countMinesAround(i);
      }
    }
  }

  // Pomocná funkce pro výpočet min v okolí (osmisměrka)
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

  // Odkrytí políčka (rekurzivní Flood Fill logika)
  reveal(index: number) {
    if (this.grid[index].isFlagged || this.grid[index].isRevealed) return;

    this.grid[index].isRevealed = true;

    if (this.grid[index].isMine) {
      // PROHRA
      this.gameOver = true;
      this.stopTimer();
      this.showAlert('Prohra 💥', 'Bouchl jsi na minu!');
      this.revealAll();
    } else {
      // Pokud je to nula (prázdno), odkryj automaticky okolí
      if (this.grid[index].neighborCount === 0) {
        this.expandZero(index);
      }
      this.checkWin();
    }
  }

  // Rekurzivní funkce pro odkrývání prázdných oblastí
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
            this.reveal(newIndex); // Volá znovu reveal (rekurze)
          }
        }
      }
    }
  }

  // Odkryje vše (při prohře)
  revealAll() {
    this.grid.forEach(c => {
      if (c.isMine) c.isRevealed = true;
    });
  }

  // Kontrola vítězství (všechna bezpečná pole jsou odkryta)
  async checkWin() {
    const revealedCount = this.grid.filter(c => c.isRevealed).length;
    if (revealedCount === (this.rows * this.cols - this.totalMines)) {
      this.gameWon = true;
      this.gameOver = true;
      this.stopTimer();
      await this.saveScoreToFirebase(); // Uložení do cloudu
      this.showAlert('Výhra! 🎉', `Čas: ${this.seconds} sekund`);
    }
  }

  // Časovač
  startTimer() {
    this.timerInterval = setInterval(() => {
      this.seconds++;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  // Úklid při opuštění stránky
  ngOnDestroy() {
    this.stopTimer();
  }

  // Uložení výsledku do Firestore databáze
  async saveScoreToFirebase() {
    // Načtení jména z paměti telefonu (Preferences)
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