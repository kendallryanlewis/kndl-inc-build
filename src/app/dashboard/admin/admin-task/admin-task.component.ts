import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  assignee: string;
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  category: string;
  createdDate: string;
}

@Component({
  selector: 'app-admin-task',
  templateUrl: './admin-task.component.html',
  styleUrls: ['./admin-task.component.scss']
})
export class AdminTaskComponent {
  @Input() subTab: string = 'Tasks';
  @Output() childTabs = new EventEmitter<string[]>();
  sectionIds: string[] = ['Tasks'];
  private previousSubTab: string = '';

  // Kanban columns
  columns = ['To Do', 'In Progress', 'Review', 'Done'];

  // Show new task modal
  showNewTaskModal = false;

  // Show edit task modal
  showEditTaskModal = false;

  // Dropdown state
  dropdownOpen: string | null = null;

  // Drag and drop state
  draggedTask: Task | null = null;
  isDragOver: string | null = null;

  // New task form
  newTask: Partial<Task> = {
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    assignee: '',
    category: '',
    status: 'To Do'
  };

  // Edit task form
  editTask: Task = {
    id: '',
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    assignee: '',
    category: '',
    status: 'To Do',
    createdDate: ''
  };

  // Sample tasks data
  tasks: Task[] = [];

  private tasksCollection = 'tasks';

  ngAfterViewInit() {
  }

  async ngOnInit(): Promise<void> {
    // Ensure subTab defaults to 'Home' if not provided
    if (!this.subTab || this.subTab.trim() === '') {
      this.subTab = 'Home';
    }
    // Load data asynchronously and emit child tabs
    await Promise.all([
      this.emitChildTabs()
    ]);
    this.loadTasksFromDb();
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


  async loadTasksFromDb() {
    const db = getFirestore();
    const querySnapshot = await getDocs(collection(db, this.tasksCollection));
    this.tasks = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data['title'] || '',
        description: data['description'] || '',
        priority: data['priority'] || 'Low',
        assignee: data['assignee'] || '',
        status: data['status'] || 'To Do',
        category: data['category'] || '',
        dueDate: data['dueDate'] ? String(data['dueDate']) : '',
        createdDate: data['createdDate'] || '',
      };
    }) as Task[];
  }

  async addTaskToDb(task: Task) {
    const db = getFirestore();
    const taskData = {
      ...task,
      dueDate: (task.dueDate && typeof task.dueDate !== 'string') ? (task.dueDate as Date).toISOString() : task.dueDate,
      createdDate: task.createdDate,
    };
    await addDoc(collection(db, this.tasksCollection), taskData);
    await this.loadTasksFromDb();
  }

  async updateTaskInDb(task: Task) {
    const db = getFirestore();
    const ref = doc(db, this.tasksCollection, String(task.id));
    const taskData = {
      ...task,
      dueDate: (task.dueDate && typeof task.dueDate !== 'string') ? (task.dueDate as Date).toISOString() : task.dueDate,
      createdDate: task.createdDate,
    };
    await setDoc(ref, taskData, { merge: true });
    await this.loadTasksFromDb();
  }

  async deleteTaskFromDb(taskId: string) {
    const db = getFirestore();
    await deleteDoc(doc(db, this.tasksCollection, taskId));
    await this.loadTasksFromDb();
  }


  // Get tasks by status for Kanban columns
  getTasksByStatus(status: string): Task[] {
    return this.tasks.filter(task => task.status === status);
  }

  // Get priority color
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Critical': return '#dc3545';
      case 'High': return '#fd7e14';
      case 'Medium': return '#ffc107';
      case 'Low': return '#28a745';
      default: return '#6c757d';
    }
  }

  // Get priority icon
  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'Critical': return 'fa-exclamation-triangle';
      case 'High': return 'fa-arrow-up';
      case 'Medium': return 'fa-minus';
      case 'Low': return 'fa-arrow-down';
      default: return 'fa-circle';
    }
  }

  // Check if task is overdue
  isOverdue(dueDate: string): boolean {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  }

  // Get days until due
  getDaysUntilDue(dueDate: string): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Open new task modal
  openNewTaskModal(): void {
    this.showNewTaskModal = true;
    this.resetNewTask();
  }

  // Close new task modal
  closeNewTaskModal(): void {
    this.showNewTaskModal = false;
    this.resetNewTask();
  }

  // Reset new task form
  resetNewTask(): void {
    this.newTask = {
      title: '',
      description: '',
      priority: 'Medium',
      dueDate: '',
      assignee: '',
      category: '',
      status: 'To Do'
    };
  }

  // Add new task
  addTask(): void {
    if (this.newTask.title && this.newTask.description) {
      const task: Task = {
        id: 'TASK-' + String(this.tasks.length + 1).padStart(3, '0'),
        title: this.newTask.title!,
        description: this.newTask.description!,
        priority: this.newTask.priority as 'Low' | 'Medium' | 'High' | 'Critical',
        dueDate: this.newTask.dueDate!,
        assignee: this.newTask.assignee!,
        status: this.newTask.status as 'To Do' | 'In Progress' | 'Review' | 'Done',
        category: this.newTask.category!,
        createdDate: new Date().toISOString().split('T')[0]
      };

      this.tasks.push(task);
      this.updateTaskInDb(task); // Sync new task to Firestore
      this.closeNewTaskModal();
    }
  }

  // Open edit task modal
  openEditTaskModal(task: Task): void {
    this.editTask = { ...task }; // Copy task data to edit form
    this.showEditTaskModal = true;
  }

  // Close edit task modal
  closeEditTaskModal(): void {
    this.showEditTaskModal = false;
    this.resetEditTask();
  }

  // Reset edit task form
  resetEditTask(): void {
    this.editTask = {
      id: '',
      title: '',
      description: '',
      priority: 'Medium',
      dueDate: '',
      assignee: '',
      category: '',
      status: 'To Do',
      createdDate: ''
    };
  }

  // Save edited task
  saveEditTask(): void {
    if (this.editTask.title && this.editTask.description) {
      // Find and update the task in the tasks array
      const taskIndex = this.tasks.findIndex(t => t.id === this.editTask.id);
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = { ...this.editTask };
        this.updateTaskInDb(this.editTask); // Sync edited task to Firestore
      }
      this.closeEditTaskModal();
    }
  }

  // Move task to different status
  moveTask(taskId: string, newStatus: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = newStatus as 'To Do' | 'In Progress' | 'Review' | 'Done';
      this.updateTaskInDb(task); // Sync moved task to Firestore
    }
  }

  // Delete task
  deleteTask(taskId: string): void {
    this.tasks = this.tasks.filter(task => task.id !== taskId);
    this.deleteTaskFromDb(taskId); // Sync deletion to Firestore
  }

  // Toggle dropdown for task
  toggleDropdown(taskId: string): void {
    this.dropdownOpen = this.dropdownOpen === taskId ? null : taskId;
  }

  // Close dropdown
  closeDropdown(): void {
    this.dropdownOpen = null;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.closeDropdown();
    }
  }

  // Drag and Drop Methods
  onDragStart(event: DragEvent, task: Task): void {
    this.draggedTask = task;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', task.id);
    }

    // Add visual feedback to the dragged element
    const target = event.target as HTMLElement;
    target.style.opacity = '0.5';
  }

  onDragEnd(event: DragEvent): void {
    // Reset visual feedback
    const target = event.target as HTMLElement;
    target.style.opacity = '1';

    // Clear dragged task
    this.draggedTask = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragEnter(event: DragEvent, column: string): void {
    event.preventDefault();
    if (this.draggedTask && this.draggedTask.status !== column) {
      this.isDragOver = column;
    }
  }

  onDragLeave(event: DragEvent): void {
    // Only clear if we're actually leaving the drop zone
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.isDragOver = null;
    }
  }

  onDrop(event: DragEvent, targetColumn: string): void {
    event.preventDefault();

    // Clear drag over state
    this.isDragOver = null;

    if (this.draggedTask && this.draggedTask.status !== targetColumn) {
      // Update task status
      this.draggedTask.status = targetColumn as 'To Do' | 'In Progress' | 'Review' | 'Done';

      // Find and update the task in the tasks array
      const taskIndex = this.tasks.findIndex(t => t.id === this.draggedTask!.id);
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = { ...this.draggedTask };
        // Sync drag-and-drop changes to Firestore
        this.updateTaskInDb(this.draggedTask);
      }
    }

    // Clear dragged task
    this.draggedTask = null;
  }
}
