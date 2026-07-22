import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Dialogs } from '@layout/dialogs/dialogs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Dialogs],
  templateUrl: './app.html',
})
export class App {}
