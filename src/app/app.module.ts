import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { registerLocaleData } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import localeEnGb from '@angular/common/locales/en-GB';
import { FormsModule } from '@angular/forms';

registerLocaleData(localeEnGb, 'en-GB');

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [DatePipe, { provide: LOCALE_ID, useValue: 'en-GB' }, DecimalPipe],
  bootstrap: [AppComponent]
})
export class AppModule {}
