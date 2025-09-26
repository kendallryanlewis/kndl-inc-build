import { ChangeDetectorRef, Component, OnChanges, SimpleChanges, HostListener, OnDestroy, OnInit, Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { UserServiceService } from '../services/user-service.service';
import { User } from '../models/User';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

enum MainTabs {
  Onboarding = 'onboarding',
  Dashboard = 'dashboard',
  Projects = 'projects',
  Designs = 'designs',
  Content = 'content',
  Billing = 'billing',
  Support = 'support'
}

// Navigation type enum to determine if tab should scroll or change page
enum NavigationType {
  PAGE_CHANGE = 'page',
  SCROLL_TO_SECTION = 'scroll'
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})

export class DashboardComponent implements OnDestroy, OnChanges, OnInit {
  isDarkMode: boolean = false;
  administrator = false;
  user: User | null = null;
  email = 'kndl.test@gmail.com';
  selectedTab: string = 'onboarding';
  tabs = Object.values(MainTabs);
  subTab: string = '';
  availableSectionIds: string[] = [];
  onboaringCompleted: boolean = false;
  showMobileNav: boolean = false;
  showUserSettings: boolean = false;
  isUploadingPhoto: boolean = false;
  uploadProgress: number = 0;
  private intersectionObserver: IntersectionObserver | null = null;
  constructor(
    private userService: UserServiceService,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedTab']) {
      this.onTabChange(this.selectedTab);
    }
  }

  ngOnInit() {
    this.loadDarkModePreference();
    this.verifyLogin();
    this.updateBodyClass();
  }

  private loadDarkModePreference() {
    const savedDarkMode = localStorage.getItem('isDarkMode');
    if (savedDarkMode !== null) {
      this.isDarkMode = savedDarkMode === 'true';
    }
  }

  verifyOnboardingCompletion(user: User) {
    this.onboaringCompleted = user.onboardingCompleted || false;
    this.selectedTab = this.onboaringCompleted ? 'overview' : 'onboarding';
  }

  onTabChange(tab: string) {
    this.selectedTab = tab;

    // Save the current tab to local storage
    localStorage.setItem('lastOpenedTab', tab);

    this.cdr.detectChanges(); // Ensure the view updates before scrolling
  }

  onSubTabChange(id: string) {
    this.scrollToElement(id);
    this.subTab = id;
  }

  scrollToElement(elementId: string) {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  }

  verifyLogin() {
    // Import Firebase Auth dynamically
    import('firebase/auth').then(({ getAuth, onAuthStateChanged }) => {
      const auth = getAuth();

      onAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser) {
          window.location.href = '/login';
          return;
        }

        // Check if user data exists in localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          this.user = JSON.parse(storedUser);
          this.checkAdminRole();
        } else {
          // Load user data from Firestore if not in localStorage
          this.loadUserDataFromFirestore(firebaseUser.uid, firebaseUser.email!);
        }
      });
    });
  }

  private async loadUserDataFromFirestore(uid: string, email: string) {
    try {
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const firestore = getFirestore();
      const userDoc = await getDoc(doc(firestore, 'users', uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        this.user = userData;
        localStorage.setItem('user', JSON.stringify(userData));

        // If user doesn't have a profile picture URL, try to retrieve it from storage
        if (!userData.avatarUrl) {
          console.log('No avatar URL in user data, attempting to retrieve from storage...');
          const profilePictureUrl = await this.getUserProfilePicture(uid);
          if (profilePictureUrl) {
            this.user.avatarUrl = profilePictureUrl;
            localStorage.setItem('user', JSON.stringify(this.user));
            console.log('Profile picture retrieved and cached:', profilePictureUrl);
          }
        } else {
          console.log('User profile picture URL found:', userData.avatarUrl);
        }

        this.checkAdminRole();
      } else {
        console.log('User document not found in Firestore');
        // You might want to create a basic user document or handle this case
        this.user = { email: email } as User;
      }
    } catch (error) {
      console.error('Error loading user data from Firestore:', error);
    }
  }

  private checkAdminRole() {
    // First, verify if user data exists in localStorage
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      console.warn('No user data found in localStorage, cannot check admin role');
      // Redirect to login if no user data is found
      window.location.href = '/login';
      return;
    }

    // Parse and validate the stored user data
    try {
      const parsedUser = JSON.parse(storedUser) as User;

      // Ensure we have the parsed user data
      if (!parsedUser || typeof parsedUser !== 'object') {
        console.error('Invalid user data format in localStorage');
        localStorage.removeItem('user'); // Clear invalid data
        window.location.href = '/login';
        return;
      }

      // Update the component user if it's not set or different
      if (!this.user || this.user.id !== parsedUser.id) {
        this.user = parsedUser;
        console.log('User data loaded from localStorage:', this.user);
      }

      // Check if user has admin role - support both role formats
      const hasAdminRole = !!(this.user.role && this.user.role === 'Admin');
      this.administrator = hasAdminRole;

      console.log(`User role check - Role: ${this.user.role}, Is Admin: ${this.administrator}`);

      // Determine default tab based on admin status
      const lastOpenedTab = localStorage.getItem('lastOpenedTab');
      let defaultTab: string;

      if (this.administrator) {
        // If user is admin, prefer admin tab or last opened tab
        defaultTab = lastOpenedTab || 'admin';
      } else {
        // For regular users, prefer overview or last opened tab (but not admin)
        defaultTab = (lastOpenedTab && lastOpenedTab !== 'admin') ? lastOpenedTab : 'overview';
      }

      this.onTabChange(defaultTab);

    } catch (parseError) {
      console.error('Error parsing user data from localStorage:', parseError);
      localStorage.removeItem('user'); // Clear corrupted data
      window.location.href = '/login';
    }
  }

  onSetSubTab(id: string) {
    this.subTab = id;
  }

  setChildTabs(list: string[]) {
    this.availableSectionIds = list;
    // Auto-select the first available section if there are sections and no current selection
    if (list && list.length > 0 && (!this.subTab || !list.includes(this.subTab))) {
      // Find the first item that isn't a separator ('|')
      const firstValidSection = list.find(item => item !== '|');
      if (firstValidSection) {
        this.subTab = firstValidSection;
        console.log('Auto-selected first section:', firstValidSection);
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const dropdownElement = target.closest('.dropdown');

    // If click is outside the dropdown, close it
    if (!dropdownElement && this.showUserSettings) {
      this.showUserSettings = false;
    }
  }

  logout() {
    // Sign out from Firebase Auth
    import('firebase/auth').then(({ getAuth }) => {
      const auth = getAuth();
      auth.signOut().finally(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('userSettings');
        window.location.href = '/login';
      });
    });
  }

  // Mobile navigation methods
  toggleMobileNav() {
    this.showMobileNav = !this.showMobileNav;
  }

  closeMobileNav() {
    this.showMobileNav = false;
  }

  // User settings methods
  toggleUserSettings(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showUserSettings = !this.showUserSettings;
  }

  // Dark mode methods
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    this.updateBodyClass();
    // Optional: save dark mode preference to localStorage
    localStorage.setItem('isDarkMode', this.isDarkMode.toString());
  }

  private updateBodyClass() {
    const body = this.document.body;
    if (this.isDarkMode) {
      this.renderer.addClass(body, 'darkMode');
    } else {
      this.renderer.removeClass(body, 'darkMode');
    }
  }

  onProfilePictureSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      this.uploadProfilePicture(file);
    }
  }

  async uploadProfilePicture(file: File) {
    if (!this.user) {
      console.error('No user found in component');
      alert('User not found. Please log in again.');
      return;
    }

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB.');
        return;
      }

      this.isUploadingPhoto = true;
      this.uploadProgress = 0;

      // Get Firebase Storage instance
      const storage = getStorage();

      // Create unique filename with user ID and timestamp
      const timestamp = new Date().getTime();
      const fileName = `profile-pictures/${this.user.id}_${timestamp}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, fileName);

      // Delete old profile picture if it exists
      if (this.user.avatarUrl && this.user.avatarUrl.includes('firebase')) {
        try {
          // Extract the file path from the URL
          const oldImageRef = ref(storage, this.extractFirebaseStoragePath(this.user.avatarUrl));
          await deleteObject(oldImageRef);
        } catch (deleteError) {
          console.warn('Could not delete old profile picture:', deleteError);
          // Continue with upload even if delete fails
        }
      }

      // Upload the new file
      console.log('Starting file upload to Firebase Storage...');
      const snapshot = await uploadBytes(storageRef, file);
      console.log('File uploaded successfully, snapshot:', snapshot);

      // Get the download URL
      console.log('Getting download URL...');
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Profile picture uploaded successfully:', downloadURL);

      // Update user object locally
      this.user.avatarUrl = downloadURL;

      // Update user in localStorage
      localStorage.setItem('user', JSON.stringify(this.user));

      // Update user in Firestore
      await this.updateUserProfileInFirestore(downloadURL);

      // Create a preview for immediate UI update
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.user && e.target?.result) {
          this.cdr.detectChanges(); // Trigger change detection
        }
      };
      reader.readAsDataURL(file);

      alert('Profile picture updated successfully!');

    } catch (error) {
      console.error('Detailed error uploading profile picture:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      alert('Failed to upload profile picture. Please check the console and try again.');
    } finally {
      this.isUploadingPhoto = false;
      this.uploadProgress = 0;
    }
  }

  /**
   * Extract Firebase Storage path from download URL
   */
  private extractFirebaseStoragePath(url: string): string {
    try {
      // Extract path from Firebase Storage URL
      const urlParts = url.split('/o/')[1];
      const pathPart = urlParts.split('?')[0];
      return decodeURIComponent(pathPart);
    } catch (error) {
      console.error('Error extracting storage path:', error);
      return '';
    }
  }

  /**
   * Update user profile in Firestore
   */
  private async updateUserProfileInFirestore(avatarUrl: string) {
    try {
      // Import Firestore functions dynamically
      const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
      const db = getFirestore();

      if (this.user?.id) {
        const userRef = doc(db, 'users', this.user.id);
        await updateDoc(userRef, {
          avatarUrl: avatarUrl,
          lastUpdated: new Date()
        });
        console.log('User profile updated in Firestore');
      }
    } catch (error) {
      console.error('Error updating user profile in Firestore:', error);
      // Don't throw error here as the upload was successful
    }
  }

  /**
   * Retrieve user profile picture from Firebase Storage
   * @param userId - The user ID to get the profile picture for
   * @returns Promise<string | null> - The download URL or null if no image found
   */
  async getUserProfilePicture(userId?: string): Promise<string | null> {
    try {
      const targetUserId = userId || this.user?.id;
      if (!targetUserId) {
        console.warn('No user ID provided for profile picture retrieval');
        return null;
      }

      const storage = getStorage();

      // Try to find the user's latest profile picture
      // Since we store with timestamp, we'll try the current user's stored avatarUrl first
      if (this.user?.avatarUrl && this.user.avatarUrl.includes('firebasestorage')) {
        try {
          // Verify the URL is still valid by attempting to get it
          const storageRef = ref(storage, this.extractFirebaseStoragePath(this.user.avatarUrl));
          const url = await getDownloadURL(storageRef);
          console.log('Retrieved cached profile picture URL:', url);
          return url;
        } catch (error) {
          console.warn('Cached profile picture URL is invalid, will try to find latest:', error);
        }
      }

      // If cached URL failed, try to construct a typical path (this is a fallback)
      const profilePicRef = ref(storage, `profile-pictures/${targetUserId}`);
      try {
        const url = await getDownloadURL(profilePicRef);
        console.log('Retrieved profile picture from typical path:', url);
        return url;
      } catch (error) {
        console.warn('No profile picture found at typical path:', error);
      }

      return null;
    } catch (error) {
      console.error('Error retrieving user profile picture:', error);
      return null;
    }
  }

  /**
   * Get profile picture URL with fallback to default
   * @param userId - Optional user ID, defaults to current user
   * @returns string - Profile picture URL or default image path
   */
  getProfilePictureUrl(userId?: string): string {
    const targetUserId = userId || this.user?.id;

    // If we have a cached URL, use it
    if (this.user?.avatarUrl) {
      return this.user.avatarUrl;
    }

    // Return default image
    return 'assets/Images/team.jpg';
  }

  /**
   * Refresh user profile picture from storage
   */
  async refreshProfilePicture(): Promise<void> {
    try {
      console.log('Refreshing profile picture from storage...');
      const profileUrl = await this.getUserProfilePicture();

      if (profileUrl && this.user) {
        this.user.avatarUrl = profileUrl;
        localStorage.setItem('user', JSON.stringify(this.user));
        this.cdr.detectChanges();
        console.log('Profile picture refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing profile picture:', error);
    }
  }

  /**
   * Handle profile picture loading errors
   */
  onProfilePictureError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    console.warn('Profile picture failed to load, using default image');
    imgElement.src = 'assets/Images/team.jpg';
  }

  /**
   * Get all profile pictures for a user (optional method for future use)
   * This could be useful for implementing a profile picture history or gallery
   */
  async getUserProfilePictureHistory(userId?: string): Promise<string[]> {
    try {
      const targetUserId = userId || this.user?.id;
      if (!targetUserId) {
        return [];
      }

      const storage = getStorage();
      const { listAll } = await import('firebase/storage');

      // List all files in the user's profile pictures folder
      const profilePicturesRef = ref(storage, `profile-pictures/`);
      const listResult = await listAll(profilePicturesRef);

      // Filter files that belong to this user
      const userFiles = listResult.items.filter(item =>
        item.name.startsWith(targetUserId)
      );

      // Get download URLs for all files
      const urls: string[] = [];
      for (const fileRef of userFiles) {
        try {
          const url = await getDownloadURL(fileRef);
          urls.push(url);
        } catch (error) {
          console.warn('Could not get download URL for:', fileRef.name, error);
        }
      }

      console.log(`Found ${urls.length} profile pictures for user ${targetUserId}`);
      return urls;
    } catch (error) {
      console.error('Error getting user profile picture history:', error);
      return [];
    }
  }

  openProfileSettings(event: Event) {
    event.preventDefault();
    this.showUserSettings = false;
    // TODO: Open profile settings modal or navigate to profile page
    console.log('Opening profile settings...');
  }

  openAccountSettings(event: Event) {
    event.preventDefault();
    this.showUserSettings = false;
    // TODO: Open account settings modal or navigate to account page
    console.log('Opening account settings...');
  }

  openNotificationSettings(event: Event) {
    event.preventDefault();
    this.showUserSettings = false;
    // TODO: Open notification settings modal
    console.log('Opening notification settings...');
  }

  ngOnDestroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}
