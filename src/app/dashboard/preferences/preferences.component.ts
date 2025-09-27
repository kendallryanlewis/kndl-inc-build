import { Component, OnInit } from '@angular/core';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { User } from '../../models/User';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent implements OnInit {
  currentUser: User | null = null;
  originalUserData: User | null = null;
  isLoading = false;
  isSaving = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  private async loadCurrentUser(): Promise<void> {
    this.isLoading = true;

    try {
      const auth = getAuth();

      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          await this.fetchUserData(firebaseUser.uid);
        } else {
          console.log('No user authenticated');
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      this.errorMessage = 'Failed to load user authentication';
      this.isLoading = false;
    }
  }

  private async fetchUserData(userId: string): Promise<void> {
    try {
      const firestore = getFirestore();
      const userDoc = await getDoc(doc(firestore, 'users', userId));

      if (userDoc.exists()) {
        const data = userDoc.data();
        this.currentUser = {
          ...data,
          id: userId,
          joinDate: data['joinDate'] ? new Date(data['joinDate']) : undefined,
          lastLogin: data['lastLogin'] ? new Date(data['lastLogin']) : undefined
        } as User;

        // Store original data for comparison
        this.originalUserData = JSON.parse(JSON.stringify(this.currentUser));
      } else {
        this.errorMessage = 'User profile not found';
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      this.errorMessage = 'Failed to load user profile';
    } finally {
      this.isLoading = false;
    }
  }

  hasUnsavedChanges(): boolean {
    if (!this.currentUser || !this.originalUserData) return false;

    return (
      this.currentUser.firstName !== this.originalUserData.firstName ||
      this.currentUser.lastName !== this.originalUserData.lastName ||
      this.currentUser.email !== this.originalUserData.email ||
      this.currentUser.phone !== this.originalUserData.phone ||
      this.currentUser.location !== this.originalUserData.location ||
      this.currentUser.bio !== this.originalUserData.bio
    );
  }

  getChangedFieldsCount(): number {
    if (!this.currentUser || !this.originalUserData) return 0;

    let count = 0;
    if (this.currentUser.firstName !== this.originalUserData.firstName) count++;
    if (this.currentUser.lastName !== this.originalUserData.lastName) count++;
    if (this.currentUser.email !== this.originalUserData.email) count++;
    if (this.currentUser.phone !== this.originalUserData.phone) count++;
    if (this.currentUser.location !== this.originalUserData.location) count++;
    if (this.currentUser.bio !== this.originalUserData.bio) count++;

    return count;
  }

  getFormCompletionPercentage(): number {
    if (!this.currentUser) return 0;

    const requiredFields = ['firstName', 'lastName', 'email'];
    const optionalFields = ['phone', 'location', 'bio'];
    const allFields = [...requiredFields, ...optionalFields];

    let completedFields = 0;

    requiredFields.forEach(field => {
      if (this.currentUser![field as keyof User] &&
        String(this.currentUser![field as keyof User]).trim().length > 0) {
        completedFields++;
      }
    });

    optionalFields.forEach(field => {
      if (this.currentUser![field as keyof User] &&
        String(this.currentUser![field as keyof User]).trim().length > 0) {
        completedFields++;
      }
    });

    return Math.round((completedFields / allFields.length) * 100);
  }

  async saveProfile(): Promise<void> {
    if (!this.currentUser || this.isSaving) return;

    // Validate required fields
    if (!this.currentUser.firstName?.trim() || !this.currentUser.lastName?.trim()) {
      this.errorMessage = 'First name and last name are required.';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.currentUser.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Update the user name from first and last name
      this.currentUser.name = `${this.currentUser.firstName} ${this.currentUser.lastName}`;

      // Save to Firebase
      const firestore = getFirestore();
      await updateDoc(doc(firestore, 'users', this.currentUser.id), {
        firstName: this.currentUser.firstName,
        lastName: this.currentUser.lastName,
        name: this.currentUser.name,
        email: this.currentUser.email,
        phone: this.currentUser.phone,
        location: this.currentUser.location,
        bio: this.currentUser.bio
      });

      // Update original data to reflect the saved state
      this.originalUserData = JSON.parse(JSON.stringify(this.currentUser));

      this.successMessage = 'Profile updated successfully!';

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);

    } catch (error) {
      console.error('Error saving profile:', error);
      this.errorMessage = 'Failed to update profile: ' + (error as Error).message;
    } finally {
      this.isSaving = false;
    }
  }

  cancelChanges(): void {
    if (this.hasUnsavedChanges() && confirm('Cancel all unsaved changes?')) {
      if (this.originalUserData) {
        this.currentUser = JSON.parse(JSON.stringify(this.originalUserData));
      }
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  clearMessage(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
