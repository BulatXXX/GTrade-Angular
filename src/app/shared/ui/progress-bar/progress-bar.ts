import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss',
})
export class ProgressBarComponent {
  @Input() value: number = 0;
  @Input() indeterminate: boolean = false;
  @Input() label: string = '';
  @Input() running: boolean = false;
}
