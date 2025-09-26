import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { getAuth, createUserWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { User } from '../../../models/User';
export type UserRole = 'Admin' | 'User' | 'Manager';
export type UserStatus = 'Active' | 'Deleted' | 'Invited';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit, OnChanges {
  @Input() subTab: string = 'Home';
  @Output() childTabs = new EventEmitter<string[]>();
  sectionIds: string[] = ['Users'];
  private previousSubTab: string = '';
  @Input() selectedTab: 'current-users' | 'deleted-users' | 'invited-users' = 'current-users';
  activeTab: string = 'overview';
  showInviteModal = false;
  showCreateUserModal = false;
  showEditUserModal = false;
  editingUser: User | null = null;
  openDetails = false;
  selectedUser: User | null = null;
  profileTab: 'experience' | 'biography' | 'skills' | 'portfolio' = 'experience';
  searchQuery = '';
  users: User[] = [];
  savingSettings = false; // Track saving state for better UX
  originalUserData: User | null = null; // Store original data for comparison
  successMessage: string = ''; // Success message display
  errorMessage: string = ''; // Error message display

  // Available tabs for navigation
  availableTabs = [
    { id: 'overview', label: 'Overview', icon: 'fa-chart-line' },
    { id: 'activity', label: 'Activity', icon: 'fa-history' },
    { id: 'permissions', label: 'Permissions', icon: 'fa-shield-alt' },
    { id: 'settings', label: 'Settings', icon: 'fa-cog' }
  ];

  email = '';
  password = '';
  firstName = '';
  lastName = '';

  // Computed filtering
  private get q(): string { return this.searchQuery.trim().toLowerCase(); }
  private match(u: User): boolean { return !this.q || u.name.toLowerCase().includes(this.q) || u.email.toLowerCase().includes(this.q); }
  get activeUsers(): User[] { return this.users.filter(u => u.status === 'Active' && this.match(u)); }
  get deletedUsers(): User[] { return this.users.filter(u => u.status === 'Deleted' && this.match(u)); }
  get invitedUsers(): User[] { return this.users.filter(u => u.status === 'Invited' && this.match(u)); }

  constructor() { }

  async ngOnInit(): Promise<void> {
    // Ensure subTab defaults to 'Home' if not provided
    if (!this.subTab || this.subTab.trim() === '') {
      this.subTab = 'Home';
    }
    // Load data asynchronously and emit child tabs
    await Promise.all([
      this.emitChildTabs()
    ]);
    // Wait for authentication state before loading users
    this.waitForAuthAndLoadUsers();
  }

  ngOnChanges(): void {
    if (this.subTab !== this.previousSubTab) {
      // DON'T reset changed fields when switching tabs - preserve changes across views
      // Only update the cached properties to reflect current state
      this.previousSubTab = this.subTab;
    }
  }
  private async emitChildTabs(): Promise<void> {
    // Emit available section IDs to parent components
    this.childTabs.emit(this.sectionIds);
  }

  // Helper for unified template
  getCurrentUsers(): User[] {
    switch (this.selectedTab) {
      case 'current-users': return this.activeUsers;
      case 'deleted-users': return this.deletedUsers;
      case 'invited-users': return this.invitedUsers;
      default: return this.activeUsers;
    }
  }
  async softDeleteUser(user: User) {
    if (user.status !== 'Deleted' && confirm(`Soft delete ${user.name}?`)) {
      const firestore = getFirestore();
      await updateDoc(doc(firestore, 'users', user.id), { isDeleted: true, status: 'Deleted' });
      await this.loadUsers();
    }
  }

  async hardDeleteUser(user: User) {
    if (user.status === 'Deleted' && confirm(`Hard delete ${user.name}? This cannot be undone.`)) {
      const firestore = getFirestore();
      await deleteDoc(doc(firestore, 'users', user.id));
      await this.loadUsers();
    }
  }
  async loadUsers() {
    try {
      console.log('Loading users from Firestore...');

      // Check authentication status
      const auth = getAuth();
      const currentUser = auth.currentUser;
      console.log('Current user:', currentUser ? currentUser.email : 'No user authenticated');

      const firestore = getFirestore();
      console.log('Firestore instance:', firestore);

      const querySnapshot = await getDocs(collection(firestore, 'users'));
      console.log('Firestore query completed. Documents found:', querySnapshot.docs.length);

      this.users = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        console.log('Processing user document:', docSnap.id, data);
        return {
          ...data,
          id: data['id'],
          joinDate: data['joinDate'] ? new Date(data['joinDate']) : undefined,
          lastLogin: data['lastLogin'] ? new Date(data['lastLogin']) : undefined
        } as User;
      });

      console.log('Users loaded successfully:', this.users.length, 'users');
    } catch (error) {
      console.error('Error loading users from Firestore:', error);
      // Show more detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      alert('Error loading users: ' + (error as Error).message);
    }
  }

  // Tab Management Methods
  setActiveTab(tabId: string): void {
    if (!this.availableTabs.find(tab => tab.id === tabId)) return;

    // Check for unsaved changes when leaving settings tab
    if (this.activeTab === 'settings' && tabId !== 'settings' && this.hasUnsavedChanges()) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave this tab? Your changes will be lost.')) {
        return;
      }
      // If user confirms, restore original data to clear changes
      if (this.selectedUser && this.originalUserData) {
        Object.assign(this.selectedUser, this.originalUserData);
      }
    }

    this.activeTab = tabId;
    console.log(`Switched to ${tabId} tab`);
  }

  isTabActive(tabId: string): boolean {
    return this.activeTab === tabId;
  }

  getTabLabel(tabId: string): string {
    const tab = this.availableTabs.find(t => t.id === tabId);
    return tab ? tab.label : tabId;
  }

  getTabIcon(tabId: string): string {
    const tab = this.availableTabs.find(t => t.id === tabId);
    return tab ? tab.icon : 'fa-file';
  }

  navigateToNextTab(): void {
    const currentIndex = this.availableTabs.findIndex(tab => tab.id === this.activeTab);
    const nextIndex = (currentIndex + 1) % this.availableTabs.length;
    this.setActiveTab(this.availableTabs[nextIndex].id);
  }

  navigateToPreviousTab(): void {
    const currentIndex = this.availableTabs.findIndex(tab => tab.id === this.activeTab);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.availableTabs.length - 1;
    this.setActiveTab(this.availableTabs[prevIndex].id);
  }

  // User selection and management
  selectUser(user: User): void {
    // Check for unsaved changes before switching users
    if (this.hasUnsavedChanges() && this.selectedUser && this.selectedUser.id !== user.id) {
      if (!confirm('You have unsaved changes for the current user. Are you sure you want to select a different user? Your changes will be lost.')) {
        return;
      }
    }

    this.selectedUser = user;
    // Store original data for change detection
    this.originalUserData = JSON.parse(JSON.stringify(user));
    this.openDetails = true;

    // If we're not on the overview tab, switch to it when selecting a new user
    if (this.activeTab !== 'overview') {
      this.activeTab = 'overview';
    }
  }

  closeDetails(): void {
    this.openDetails = false;
    this.selectedUser = null;
    this.originalUserData = null;
  }

  // Check if user settings have been modified
  hasUnsavedChanges(): boolean {
    if (!this.selectedUser || !this.originalUserData) return false;

    return (
      this.selectedUser.firstName !== this.originalUserData.firstName ||
      this.selectedUser.lastName !== this.originalUserData.lastName ||
      this.selectedUser.email !== this.originalUserData.email ||
      this.selectedUser.phone !== this.originalUserData.phone ||
      this.selectedUser.role !== this.originalUserData.role ||
      this.selectedUser.status !== this.originalUserData.status ||
      this.selectedUser.location !== this.originalUserData.location ||
      this.selectedUser.bio !== this.originalUserData.bio
    );
  }

  // Activity and statistics methods
  getRecentActivity(user: User): Array<{ icon: string, description: string, date: Date }> {
    // Mock activity data for demonstration
    return [
      {
        icon: 'fa-sign-in-alt',
        description: 'User logged in',
        date: user.lastLogin || new Date()
      },
      {
        icon: 'fa-edit',
        description: 'Profile updated',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        icon: 'fa-check',
        description: 'Completed onboarding',
        date: user.joinDate || new Date()
      }
    ];
  }

  getLoginStreak(user: User): number {
    // Mock login streak calculation
    if (!user.lastLogin) return 0;
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - user.lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - daysDiff); // Mock streak based on recent activity
  }

  // Permissions management
  hasPermission(user: User, permission: string): boolean {
    // Mock permission check based on user role
    const rolePermissions = {
      'Admin': ['dashboard_access', 'admin_panel', 'settings_access', 'create_users', 'edit_users', 'delete_users'],
      'Manager': ['dashboard_access', 'admin_panel', 'settings_access', 'create_users', 'edit_users'],
      'User': ['dashboard_access', 'settings_access']
    };

    return rolePermissions[user.role as keyof typeof rolePermissions]?.includes(permission) || false;
  }

  // Settings form methods
  async saveUserSettings(): Promise<void> {
    if (!this.selectedUser || this.savingSettings) return;

    this.savingSettings = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.selectedUser.email)) {
        this.errorMessage = 'Please enter a valid email address.';
        return;
      }

      // Validate required fields
      if (!this.selectedUser.firstName?.trim() || !this.selectedUser.lastName?.trim()) {
        this.errorMessage = 'First name and last name are required.';
        return;
      }

      // Update the user name from first and last name
      this.selectedUser.name = `${this.selectedUser.firstName} ${this.selectedUser.lastName}`;

      // Save to Firebase
      const firestore = getFirestore();
      await updateDoc(doc(firestore, 'users', this.selectedUser.id), {
        firstName: this.selectedUser.firstName,
        lastName: this.selectedUser.lastName,
        name: this.selectedUser.name,
        email: this.selectedUser.email,
        phone: this.selectedUser.phone,
        role: this.selectedUser.role,
        status: this.selectedUser.status,
        location: this.selectedUser.location,
        bio: this.selectedUser.bio
      });

      // Reload users to refresh the list
      await this.loadUsers();

      // Update the selected user with the latest data
      const updatedUser = this.users.find(u => u.id === this.selectedUser!.id);
      if (updatedUser) {
        this.selectedUser = updatedUser;
        // Update original data to reflect the saved state
        this.originalUserData = JSON.parse(JSON.stringify(updatedUser));
      }

      this.successMessage = 'User settings saved successfully!';
      console.log('Saved user settings:', this.selectedUser);

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);

    } catch (error) {
      console.error('Error saving user settings:', error);
      this.errorMessage = 'Failed to save user settings: ' + (error as Error).message;
    } finally {
      this.savingSettings = false;
    }
  } async cancelUserSettingsChanges(): Promise<void> {
    if (!this.selectedUser || !this.originalUserData) return;

    if (this.hasUnsavedChanges() && confirm('Cancel all unsaved changes?')) {
      // Restore original data
      Object.assign(this.selectedUser, this.originalUserData);
      console.log('User settings changes cancelled - data restored');
    }
  }

  addUser(): Promise<UserCredential | void> {
    if (!this.email || !this.password || !this.firstName || !this.lastName) {
      alert('All fields are required');
      return Promise.resolve();
    }

    const auth = getAuth();
    const firestore = getFirestore();

    return createUserWithEmailAndPassword(auth, this.email, this.password)
      .then(async (userCredential) => {
        // Create User object matching the interface
        const newUser: User = {
          id: userCredential.user.uid,
          firstName: this.firstName,
          lastName: this.lastName,
          name: `${this.firstName} ${this.lastName}`,
          email: this.email,
          // phone and avatarUrl omitted if undefined
          platforms: [],
          onboardingCompleted: false,
          role: 'User',
          status: 'Active',
          joinDate: new Date(),
          lastLogin: new Date(),
          location: '',
          bio: '',
        };

        try {
          // Save User object to Firestore
          await setDoc(doc(firestore, 'users', userCredential.user.uid), newUser);

          alert('User created successfully: ' + userCredential.user.email);

          // Add to local users list for display
          this.users.push(newUser);

          // Clear form
          this.email = '';
          this.password = '';
          this.firstName = '';
          this.lastName = '';

          return userCredential;
        } catch (firestoreError) {
          console.error('Error saving user to Firestore:', firestoreError);
          alert('User created but failed to save profile data. Error: ' + (firestoreError as Error).message);
          return userCredential;
        }
      })
      .catch((error) => {
        console.error('Error creating user:', error);
        alert('Error creating user: ' + error.message);
      });
  }

  onUserClick(user: User) {
    this.selectedUser = user;
    this.openDetails = true;
  }


  private async waitForAuthAndLoadUsers() {
    try {
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth();

      onAuthStateChanged(auth, (user) => {
        if (user) {
          console.log('User authenticated, loading users...');
          this.loadUsers();
        } else {
          console.log('No user authenticated, skipping user load');
        }
      });
    } catch (error) {
      console.error('Error setting up auth state listener:', error);
      // Fallback to the old method with delay
      setTimeout(() => {
        this.loadUsers();
      }, 1000);
    }
  }

  onSearchChange(): void { /* no-op: getters handle filtering reactively */ }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  }

  getRelativeTime(date: Date): string {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return date.toLocaleDateString();
  }

  getUserExperience(user: User): Array<{ title: string, company: string, period: string, location: string, description: string, color: string }> {
    // Mock data for demonstration
    return [
      {
        title: 'Lead Consultant',
        company: 'HotelPro',
        period: '2022 - Present',
        location: 'New York, USA',
        description: 'Leading rebranding and digital transformation projects for hospitality clients.',
        color: '#667eea'
      },
      {
        title: 'Brand Strategist',
        company: 'Brandify',
        period: '2020 - 2022',
        location: 'Remote',
        description: 'Developed brand strategies for startups and SMBs.',
        color: '#764ba2'
      }
    ];
  }

  getUserSkills(user: User): Array<{ name: string, skills: string[] }> {
    // Mock data for demonstration
    return [
      { name: 'Design', skills: ['Branding', 'Logo Design', 'UI/UX'] },
      { name: 'Business', skills: ['Consulting', 'Strategy', 'Project Management'] },
      { name: 'Tech', skills: ['Angular', 'TypeScript', 'HTML', 'CSS'] }
    ];
  }

  viewPublicProfile(user: User): void {
    // Replace with actual navigation logic as needed
    window.open(`/public-profile/${user.id}`, '_blank');
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  // Tab management
  selectTab(tab: 'current-users' | 'deleted-users' | 'invited-users'): void {
    this.selectedTab = tab;
  }

  // User actions
  editUser(user: User): void {
    this.editingUser = { ...user }; // Create a copy for editing
    this.showEditUserModal = true;
  }

  async updateUser() {
    if (!this.editingUser) return;

    const firestore = getFirestore();
    await updateDoc(doc(firestore, 'users', this.editingUser.id), {
      firstName: this.editingUser.firstName,
      lastName: this.editingUser.lastName,
      name: `${this.editingUser.firstName} ${this.editingUser.lastName}`,
      email: this.editingUser.email,
      role: this.editingUser.role,
      location: this.editingUser.location,
      bio: this.editingUser.bio
    });

    await this.loadUsers();
    this.showEditUserModal = false;
    this.editingUser = null;
  }

  deleteUser(user: User): void {
    // Redirect to soft delete for consistency
    this.softDeleteUser(user);
  }

  restoreUser(user: User): void {
    if (user.status === 'Deleted' && confirm(`Are you sure you want to restore ${user.name}?`)) {
      user.status = 'Active';
      user.lastLogin = new Date();
      console.log('User restored:', user);
    }
  }

  cancelInvite(user: User): void {
    if (user.status === 'Invited' && confirm(`Are you sure you want to cancel the invitation for ${user.name}?`)) {
      this.users = this.users.filter(u => u.id !== user.id);
      console.log('Invitation cancelled for:', user);
    }
  }

  resendInvite(user: User): void {
    console.log('Resending invitation to:', user);
    // TODO: Implement resend invite functionality
    alert(`Invitation resent to ${user.email}`);
  }

  // Invite new user
  openInviteModal(): void {
    this.showInviteModal = true;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
  }

  inviteNewUser(name: string, email: string, role: 'Admin' | 'User' | 'Manager'): void {
    const newUser: User = {
      id: `invited_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      firstName: name.split(' ')[0] || '',
      lastName: name.split(' ').slice(1).join(' ') || '',
      name,
      email,
      // phone and avatarUrl omitted if undefined
      platforms: [],
      onboardingCompleted: false,
      role,
      status: 'Invited',
      joinDate: new Date(),
      lastLogin: undefined,
      location: undefined,
      bio: undefined
    };
    this.users.push(newUser);
    this.closeInviteModal();
    console.log('New user invited:', newUser);
  }

  // Utility methods
  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'Admin': return 'role-admin';
      case 'Manager': return 'role-manager';
      case 'User': return 'role-user';
      default: return 'role-user';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Active': return 'status-active';
      case 'Deleted': return 'status-deleted';
      case 'Invited': return 'status-invited';
      default: return 'status-active';
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Never';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Profile helper methods
  switchProfileTab(tab: 'experience' | 'biography' | 'skills' | 'portfolio'): void {
    this.profileTab = tab;
  }

  getUserAvatar(user: User): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=007bff&color=ffffff&size=120`;
  }

  getYearsExperience(user: User): string {
    if (!user.joinDate) return '0';
    const years = Math.floor((Date.now() - user.joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return years.toString();
  }

  getUserStats(user: User): { experience: string, certificates: string, internships: string } {
    // Mock data - in real app this would come from user profile
    return {
      experience: this.getYearsExperience(user),
      certificates: '3',
      internships: '2'
    };
  }

}

