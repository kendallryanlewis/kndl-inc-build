import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface BgState {
    /** Maps to data-tab on the gradient overlay.
     *  Values: 'home' | 'about' | 'products' | 'contact' | 'detail' */
    tab: string;
    videoHidden: boolean;
}

@Injectable({ providedIn: 'root' })
export class BackgroundService {
    private readonly _state$ = new BehaviorSubject<BgState>({ tab: 'home', videoHidden: false });
    readonly state$ = this._state$.asObservable();

    setTab(tab: string, videoHidden = false): void {
        Promise.resolve().then(() => this._state$.next({ tab, videoHidden }));
    }
}
