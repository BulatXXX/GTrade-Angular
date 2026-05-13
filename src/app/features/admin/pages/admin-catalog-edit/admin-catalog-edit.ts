import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, FormArray } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../../../../core/admin/admin-api.service';
import { CatalogItem } from '../../../../core/models/item';
import { CreateItemRequest, UpdateItemRequest } from '../../../../core/admin/admin.types';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { TPipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';

type Status = 'loading' | 'ready' | 'error' | 'saving';
type EditState = { status: Status; item: CatalogItem | null; error?: string; saveError?: string; saved?: boolean };

const initial: EditState = { status: 'loading', item: null };

@Component({
  selector: 'app-admin-catalog-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TPipe],
  templateUrl: './admin-catalog-edit.html',
  styleUrl: './admin-catalog-edit.scss',
})
export class AdminCatalogEditPage implements OnInit {
  private api = inject(AdminApiService);
  private confirm = inject(ConfirmDialogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private i18n = inject(I18nService);
  private stateSubject = new BehaviorSubject<EditState>(initial);
  state$ = this.stateSubject.asObservable();

  itemId!: string;

  form = new FormGroup({
    name: new FormControl(''),
    description: new FormControl(''),
    image_url: new FormControl(''),
    is_active: new FormControl(true),
    translations: new FormArray<FormGroup>([]),
  });

  get translations(): FormArray { return this.form.get('translations') as FormArray; }

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadItem();
  }

  loadItem(): void {
    this.patch({ status: 'loading', error: undefined });
    this.api.getItem(this.itemId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ status: 'error', error: String(err?.message ?? err) });
        return of(null);
      }),
    ).subscribe(item => {
      if (!item) return;
      this.patch({ status: 'ready', item });
      this.populateForm(item);
    });
  }

  private populateForm(item: CatalogItem): void {
    this.form.patchValue({
      name: item.name ?? '',
      description: item.description ?? '',
      image_url: item.image_url ?? '',
      is_active: item.is_active ?? true,
    });
    this.translations.clear();
    for (const translation of item.translations ?? []) {
      this.translations.push(new FormGroup({
        language_code: new FormControl(translation.language_code ?? 'en'),
        name: new FormControl(translation.name ?? ''),
        description: new FormControl(translation.description ?? ''),
      }));
    }
  }

  addTranslation(): void {
    const group = new FormGroup({
      language_code: new FormControl('en'),
      name: new FormControl(''),
      description: new FormControl(''),
    });
    this.translations.push(group);
  }

  removeTranslation(index: number): void {
    this.translations.removeAt(index);
  }

  save(): void {
    const s = this.stateSubject.value;
    if (!s.item) return;

    const val = this.form.value;
    const translations = this.normalizeTranslations();
    const hasNewTranslation = this.hasNewTranslationLanguages(s.item, translations);
    const req: UpdateItemRequest = {};
    if (val.name !== s.item.name) req.name = val.name ?? undefined;
    if ((val.description ?? '') !== (s.item.description ?? '')) req.description = val.description ?? undefined;
    if ((val.image_url ?? '') !== (s.item.image_url ?? '')) req.image_url = val.image_url ?? undefined;
    if (val.is_active !== s.item.is_active) req.is_active = val.is_active ?? undefined;
    if (translations.length > 0) req.translations = translations;

    this.patch({ status: 'saving', saveError: undefined, saved: false });
    const save$ = hasNewTranslation
      ? this.api.upsertItem(this.buildUpsertRequest(s.item, translations))
      : this.api.updateItem(this.itemId, req);

    save$.pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ status: 'ready', saveError: String(err?.message ?? err) });
        return of(null);
      }),
    ).subscribe(item => {
      if (!item) return;
      this.patch({ status: 'ready', item, saved: true });
      this.populateForm(item);
      setTimeout(() => this.patch({ saved: false }), 3000);
    });
  }

  async deleteItem(): Promise<void> {
    const s = this.stateSubject.value;
    if (!s.item) return;

    const ok = await this.confirm.confirm({
      title: this.i18n.t('admin.catalog.deleteTitle'),
      message: this.i18n.t('admin.catalog.deleteConfirm', { name: s.item.name }),
      danger: true,
      confirmLabel: this.i18n.t('admin.catalog.delete'),
    });
    if (!ok) return;

    this.api.deleteItem(this.itemId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ saveError: String(err?.message ?? err) });
        return of(null);
      }),
    ).subscribe(() => {
      this.router.navigate(['/admin/catalog']);
    });
  }

  private patch(p: Partial<EditState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...p });
  }

  private normalizeTranslations(): Array<{ language_code: string; name: string; description?: string }> {
    return this.translations.controls
      .map(group => {
        const raw = group.value as { language_code?: string | null; name?: string | null; description?: string | null };
        const language_code = String(raw.language_code ?? '').trim();
        const name = String(raw.name ?? '').trim();
        const description = String(raw.description ?? '').trim();
        return {
          language_code,
          name,
          description: description || undefined,
        };
      })
      .filter(t => t.language_code && t.name);
  }

  private hasNewTranslationLanguages(
    item: CatalogItem,
    translations: Array<{ language_code: string; name: string; description?: string }>,
  ): boolean {
    const existing = new Set((item.translations ?? []).map(t => String(t.language_code ?? '').trim()));
    return translations.some(t => !existing.has(t.language_code));
  }

  private buildUpsertRequest(
    item: CatalogItem,
    translations: Array<{ language_code: string; name: string; description?: string }>,
  ): CreateItemRequest {
    const val = this.form.value;
    return {
      game: item.game,
      source: item.source,
      external_id: item.external_id,
      slug: item.slug,
      name: val.name ?? item.name,
      description: (val.description ?? '') || undefined,
      image_url: (val.image_url ?? '') || undefined,
      is_active: val.is_active ?? item.is_active ?? true,
      translations,
    };
  }
}
