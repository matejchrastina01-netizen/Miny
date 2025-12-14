import { Component, OnInit } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
})
export class Tab3Page implements OnInit {
  playerName: string = '';
  private KEY = 'player_name';

  constructor() {}

  async ngOnInit() {
    const { value } = await Preferences.get({ key: this.KEY });
    if (value) this.playerName = value;
  }

  async saveName() {
    await Preferences.set({ key: this.KEY, value: this.playerName });
    alert('Jméno uloženo!');
  }
}