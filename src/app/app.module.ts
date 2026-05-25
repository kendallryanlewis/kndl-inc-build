import { HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { AppRoutingModule } from "./app-routing.module";
import { RouterModule } from '@angular/router';
import { AppComponent } from "./app.component";
import { LoginComponent } from "./login/login.component";
import './firebase-init';
import { KndlAboutComponent } from "./kndl/kndl-about/kndl-about.component";
import { KndlComponent } from "./kndl/kndl.component";
import { KndlContactComponent } from "./kndl/kndl-contact/kndl-contact.component";
import { KndlFeatureBarComponent } from "./kndl/kndl-feature-bar/kndl-feature-bar.component";
import { KndlHomeComponent } from "./kndl/kndl-home/kndl-home.component";
import { KndlProductsComponent } from "./kndl/kndl-products/kndl-products.component";
import { KndlSideNavComponent } from "./kndl/kndl-side-nav/kndl-side-nav.component";
import { KndlSlideoutComponent } from "./kndl/kndl-slideout/kndl-slideout.component";
import { KndlStatsBarComponent } from "./kndl/kndl-stats-bar/kndl-stats-bar.component";
import { KndlTopNavComponent } from "./kndl/kndl-top-nav/kndl-top-nav.component";
import { WeddingComponent } from "./wedding/wedding.component";
import { KndlProductDetailComponent } from "./kndl/kndl-product-detail/kndl-product-detail.component";
import { KndlAppLegalComponent } from "./kndl/kndl-app-legal/kndl-app-legal.component";

@NgModule({
  declarations: [
    AppComponent,
    KndlAboutComponent,
    KndlComponent,
    KndlContactComponent,
    KndlFeatureBarComponent,
    KndlHomeComponent,
    KndlProductsComponent,
    KndlSideNavComponent,
    KndlSlideoutComponent,
    KndlStatsBarComponent,
    KndlTopNavComponent,
    LoginComponent,
    WeddingComponent,
    KndlProductDetailComponent,
    KndlAppLegalComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    AppRoutingModule,
    RouterModule,
    FontAwesomeModule,
    FormsModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
