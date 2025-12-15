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
  // Injektování služby Firestore pro přístup k databázi
  private firestore: Firestore = inject(Firestore);
  
  // Observable stream - data se v aplikaci sama aktualizují, když se změní v databázi
  scores$: Observable<any[]> | undefined;
  
  // Výchozí zobrazení žebříčku
  selectedDifficulty = 'easy';

  constructor() {
    this.loadScores();
  }

  // Funkce pro načtení a filtrování dat z Cloudu
  loadScores() {
    const scoresCollection = collection(this.firestore, 'scores');
    
    // Sestavení databázového dotazu (Query):
    const q = query(
      scoresCollection, 
      where('difficulty', '==', this.selectedDifficulty), 
      orderBy('time', 'asc'),
      limit(20)
    );
    
    // collectionData propojí dotaz přímo s HTML šablonou
    this.scores$ = collectionData(q);
  }

  // Volá se, když uživatel přepne záložku (Malá / Střední / Velká)
  segmentChanged(event: any) {
    this.selectedDifficulty = event.detail.value;
    this.loadScores();
  }
}