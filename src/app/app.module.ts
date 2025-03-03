import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { registerLocaleData } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import localeEnGb from '@angular/common/locales/en-GB';
import { FormsModule } from '@angular/forms';

registerLocaleData(localeEnGb, 'en-GB');

@NgModule({ declarations: [AppComponent],
    bootstrap: [AppComponent], imports: [BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        AppRoutingModule], providers: [DatePipe, { provide: LOCALE_ID, useValue: 'en-GB' }, DecimalPipe, provideHttpClient(withInterceptorsFromDi())] })
export class AppModule {}
