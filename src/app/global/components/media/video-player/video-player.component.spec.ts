import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoPlayerComponent } from './video-player.component';

describe('VideoPlayerComponent', () => {
  let component: VideoPlayerComponent;
  let fixture: ComponentFixture<VideoPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoPlayerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoPlayerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('videoSource', 'https://example.com/video.mp4');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format time via helper', () => {
    expect(component['formatTime'](65)).toBe('1:05');
  });

  it('should expose picture-in-picture support flag', () => {
    expect(typeof component.pipSupported()).toBe('boolean');
  });
});
