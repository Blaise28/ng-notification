import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioPlayerComponent } from './audio-player.component';

describe('AudioPlayerComponent', () => {
  let component: AudioPlayerComponent;
  let fixture: ComponentFixture<AudioPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AudioPlayerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AudioPlayerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('audioSource', 'https://example.com/audio.mp3');
    fixture.componentRef.setInput('title', 'Track title');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display provided title', () => {
    expect(component['displayTitle']()).toBe('Track title');
  });

  it('should format time via helper', () => {
    expect(component['formatTime'](125)).toBe('2:05');
  });
});
