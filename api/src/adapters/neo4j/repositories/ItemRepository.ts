import { inject, injectable } from 'inversify';
import TYPES from '../../../container/types';
import { Item, IItemRepository } from '../../../domain/items';
import { IDbConnectionFactory } from '../infrastructure/DbConnectionFactory';

@injectable()
class ItemRepository implements IItemRepository {
  private _connection: IDbConnectionFactory;

  public constructor(
    @inject(TYPES.IDbConnectionFactory) connection: IDbConnectionFactory,
  ) {
    this._connection = connection;
  }

  public async getAll(): Promise<Item[]> {
    const cypher = `
MATCH (root:Item)
WHERE NOT(root)-[:CHILD_OF]->()
RETURN root.name as name, root.description as description, null as parent
UNION
MATCH (child:Item)-[:CHILD_OF]->(parent:Item)
RETURN child.name as name, child.description as description, parent
`;
    let items: Item[] = [];
    await this._connection.openSession(async (session) => {
      try {
        const result = await session.run(cypher);
        items = result.records.map((record) => ({
          name: record.get('name'),
          description: record.get('description'),
          parent:
            record.get('parent') !== null
              ? record.get('parent').properties
              : null,
        }));
      } catch (error) {
        console.error('Failed to retrieve items.', error);
      }
    });

    return items;
  }
}

export default ItemRepository;
