import { ElementRef, Renderer2 } from '@angular/core';
import { AnimateOnScrollDirective } from "./animat-on-scroll.directive";


describe('AnimateOnScrollDirective', () => {
  it('should create an instance', () => {
    const mockElementRef = { nativeElement: document.createElement('div') } as ElementRef;
    const mockRenderer = {} as Renderer2;
    const directive = new AnimateOnScrollDirective(mockElementRef, mockRenderer);
    expect(directive).toBeTruthy();
  });
});
