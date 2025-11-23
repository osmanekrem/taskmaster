import { db } from '@/db';
import { userService } from '@/services/user-service';
import { fieldService } from '@/services/field-service';
import { fieldTypeService } from '@/services/field-type-service';
import { ticketTypeService } from '@/services/ticket-type-service';
import type { DrizzleClient } from '@/lib/types/db';

class Container {
  private readonly _db: DrizzleClient;
  private _userService: ReturnType<typeof userService> | null = null;
  private _fieldService: ReturnType<typeof fieldService> | null = null;
  private _fieldTypeService: ReturnType<typeof fieldTypeService> | null = null;
  private _ticketTypeService: ReturnType<typeof ticketTypeService> | null =
    null;

  constructor(database: DrizzleClient = db) {
    this._db = database;
  }

  get db(): DrizzleClient {
    return this._db;
  }

  get user() {
    this._userService ??= userService(this._db);
    return this._userService;
  }

  get field() {
    this._fieldService ??= fieldService(this._db);
    return this._fieldService;
  }

  get fieldType() {
    this._fieldTypeService ??= fieldTypeService(this._db);
    return this._fieldTypeService;
  }

  get ticketType() {
    this._ticketTypeService ??= ticketTypeService(this._db);
    return this._ticketTypeService;
  }

  static create(database?: DrizzleClient): Container {
    return new Container(database);
  }
}

export const container = new Container();

export { Container };
