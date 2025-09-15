import { Component } from '@angular/core';

@Component({
  selector: 'app-kndl-top-navigation',
  templateUrl: './kndl-top-navigation.component.html',
  styleUrls: ['./kndl-top-navigation.component.scss']
})
export class KndlTopNavigationComponent {

  isLoggingIn = this.userExists();

  userExists(): boolean {
    const user = localStorage.getItem('user');
    // Optionally, check for a valid user object/structure
    return user !== null && user !== undefined && user !== '';
  }

  scrollToSection(sectionSelector: string) {
    const element = document.querySelector(sectionSelector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

}
