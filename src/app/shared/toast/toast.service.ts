import { Injectable, signal, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { ToastComponent, ToastType } from './toast.component';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastComponentRef: any;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {
    this.initToastComponent();
  }

  private initToastComponent() {
    // Crear el componente de toast una sola vez
    const componentRef = createComponent(ToastComponent, {
      environmentInjector: this.injector
    });
    
    this.appRef.attachView(componentRef.hostView);
    
    const domElem = (componentRef.hostView as any).rootNodes[0] as HTMLElement;
    document.body.appendChild(domElem);
    
    this.toastComponentRef = componentRef.instance;
  }

  success(title: string, message: string, duration = 5000) {
    this.toastComponentRef?.show('success', title, message, duration);
  }

  error(title: string, message: string, duration = 5000) {
    this.toastComponentRef?.show('error', title, message, duration);
  }

  warning(title: string, message: string, duration = 5000) {
    this.toastComponentRef?.show('warning', title, message, duration);
  }

  info(title: string, message: string, duration = 5000) {
    this.toastComponentRef?.show('info', title, message, duration);
  }
}
