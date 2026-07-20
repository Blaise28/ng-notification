import { Component, inject } from '@angular/core';

import { UserStore } from '@stores/user/user.store';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
})
export class Home {
  private readonly userStore = inject(UserStore);

  protected readonly user = this.userStore.user;
}
