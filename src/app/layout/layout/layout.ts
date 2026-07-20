import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AsideMenu } from '@layout/aside-menu/aside-menu';
import { Navbar } from '@layout/navbar/navbar';

@Component({
  selector: 'app-layout',
  imports: [Navbar, RouterOutlet, AsideMenu],
  templateUrl: './layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Layout {}
