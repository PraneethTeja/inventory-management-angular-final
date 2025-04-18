import { TestBed } from '@angular/core/testing';

import { ProductSorterService } from './product-sorter.service';

describe('ProductSorterService', () => {
  let service: ProductSorterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductSorterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
