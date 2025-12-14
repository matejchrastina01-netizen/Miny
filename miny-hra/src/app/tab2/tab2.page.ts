import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, collectionData, query, orderBy, limit, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class Tab2Page {
  private firestore: Firestore = inject(Firestore);
  
  scores$: Observable<any[]> | undefined;
  selectedDifficulty = 'easy';

  constructor() {
    this.loadScores();
  }

  loadScores() {
    const scoresCollection = collection(this.firestore, 'scores');
    
    const q = query(
      scoresCollection, 
      where('difficulty', '==', this.selectedDifficulty),
      orderBy('time', 'asc'),
      limit(20)
    );
    
    this.scores$ = collectionData(q);
  }

  segmentChanged(event: any) {
    this.selectedDifficulty = event.detail.value;
    this.loadScores();
  }
}