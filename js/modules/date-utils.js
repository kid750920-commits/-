import { DATE_FMT, DATE_TIME_FMT } from './date-formatters.js';

export function nowIso(){
  return new Date().toISOString();
}

export function compactDate(date){
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

export function toDateInput(date){
  return date.toISOString().slice(0, 10);
}

export function toLocalDateInput(date=new Date()){
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
}

export function addDaysInput(date, days){
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return toDateInput(result);
}

export function todayStart(){
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function daysBetween(from, to){
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end - start) / 86400000);
}

export function dateText(value){
  if(!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : DATE_FMT.format(date);
}

export function dateTimeText(value){
  if(!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : DATE_TIME_FMT.format(date);
}
