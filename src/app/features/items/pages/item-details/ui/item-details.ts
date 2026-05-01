import {Component, DestroyRef, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {map} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {ItemDetailsViewModel} from '../item-details-view-model';
@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './item-details.html',
  styleUrl: './item-details.scss',
})
export class ItemDetailsPage {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  vm = inject(ItemDetailsViewModel);

  placeholder = 'assets/item-placeholder.svg';
  state$ = this.vm.state$;

  constructor() {
    this.route.paramMap.pipe(
      map(pm => pm.get('id') ?? ''),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(id => {
      if (id) this.vm.load(id);
    });
  }

  toggleTracked() {
    this.vm.toggleTracked();
  }

  setMode(mode: 'pve' | 'regular') {
    this.vm.setMode(mode);
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.endsWith(this.placeholder)) return;
    img.src = this.placeholder;
  }
}
