import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { User, UserPlatform } from '../models/User';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  email = '';
  password = '';
  error = '';
  loading = false;
  private authStateSubscription?: Unsubscribe;

  constructor(private router: Router) { }

  ngOnInit() {
    const auth = getAuth();
    this.authStateSubscription = onAuthStateChanged(auth, async (user) => {
      if (user && this.router.url !== '/dashboard') {
        await this.loadUserData(user.uid);
        this.router.navigate(['/dashboard']);
      }
    });
  }

  ngOnDestroy() {
    if (this.authStateSubscription) {
      this.authStateSubscription();
    }
  }

  async onSubmit(event: Event) {
    event.preventDefault();

    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
      await this.loadUserData(userCredential.user.uid);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Login error:', error);
      this.error = this.getFirebaseErrorMessage(error.code);
    } finally {
      this.loading = false;
    }
  }

  private async loadUserData(uid: string): Promise<void> {
    try {
      const firestore = getFirestore();
      const userDocRef = doc(firestore, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const user: User = {
          id: uid,
          firstName: userData['firstName'] || '',
          lastName: userData['lastName'] || '',
          name: userData['name'] || `${userData['firstName'] || ''} ${userData['lastName'] || ''}`.trim(),
          email: userData['email'] || '',
          phone: userData['phone'] || undefined,
          avatarUrl: userData['avatarUrl'] || undefined,
          platforms: userData['platforms'] || [],
          onboardingCompleted: userData['onboardingCompleted'] || false,
          role: userData['role'] || 'User',
          status: userData['status'] || 'Active',
          joinDate: userData['joinDate']?.toDate() || new Date(),
          lastLogin: userData['lastLogin']?.toDate() || new Date(),
          location: userData['location'] || undefined,
          bio: userData['bio'] || undefined
        };

        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userSettings', JSON.stringify({
          theme: userData['theme'] || 'default',
          notifications: userData['notifications'] || true,
          language: userData['language'] || 'en'
        }));

        console.log('User data loaded successfully:', user);
      } else {
        console.error('No user document found');
        this.error = 'User profile not found. Please contact support.';
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.error = 'Failed to load user profile. Please try again.';
    }
  }

  private getFirebaseErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No user found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'Login failed. Please try again.';
    }
  }
}
