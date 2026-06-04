import { Pipe, PipeTransform } from '@angular/core';
import { pronounText } from '../utils/pronoun.util';

@Pipe({
  name: 'pronoun',
  standalone: true
})
export class PronounPipe implements PipeTransform {
  transform(text: string, pronounKey: string | undefined): string {
    return pronounText(text, pronounKey);
  }
}
