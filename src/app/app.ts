import {Component, signal} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {AppHeader} from './layout/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeader],
  templateUrl: './app.html',
  standalone: true,
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('GTrade');
}
