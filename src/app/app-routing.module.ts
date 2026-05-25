import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { KndlComponent } from './kndl/kndl.component';
import { WeddingComponent } from './wedding/wedding.component';
import { KndlProductDetailComponent } from './kndl/kndl-product-detail/kndl-product-detail.component';

const routes: Routes = [
  {
    path: '',
    component: KndlComponent,
    data: { animation: 'kndl' }
  }, {
    path: 'login',
    component: LoginComponent,
    data: { animation: 'login' }
  }, {
    path: 'logout',
    component: LoginComponent,
    data: { animation: 'login' }
  }, {
    path: 'wedding',
    component: WeddingComponent,
    data: { animation: 'wedding' }
  }, {
    path: 'products/:id',
    component: KndlProductDetailComponent,
    data: { animation: 'detail' }
  }, {
    path: 'products/:id/privacy',
    component: KndlProductDetailComponent,
    data: { animation: 'detail', legalPage: 'privacy' }
  }, {
    path: 'products/:id/terms',
    component: KndlProductDetailComponent,
    data: { animation: 'detail', legalPage: 'terms' }
  }, {
    path: 'products/:id/support',
    component: KndlProductDetailComponent,
    data: { animation: 'detail', legalPage: 'support' }
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
